
import EventEmitter from "events";

import type {
    Message,
    Object,
    Printer,
    Styler
} from "@pinglue/utils";

import {
    _clone
} from "@pinglue/utils";

import type {
    RegistryWatchEventName,
    RegistryWatchEventType,
    RegistryWatchEvent,
    RegistryWatchCallback
} from "./index";

import {
    registryWatchEventNames
} from "./index.js";

//======================================

/**
 * The base loader settings. Any loader extends this interface for its settings.
 */
export interface LoaderSettings {

    /**
     * Name of the package to load
     */
    pkgName?: string;

    /**
     * defaults to empty printer at Registry, other loaders inherit from their parent loader
     */
    print?: Printer;

    /**
     * defaults to empty styler at Registry, other loaders inherit from their parent loader
     */
    style?: Styler;

}

/**
 * All loaders, regardless of what they load, output an object with this schema
 */
export interface LoaderOutput {
    data: Object;
    warnings?: Message[];
}

/**
 * This abstract class represents a generic loader. A loader is responsible to load (or calculate) some info about the current package/project. For example InfoLoader loads the package.json of the current project along with some other config files at the project root; ChannelsLoader load the channel info found at the project *channels* folder, etc. The Pinglue registry is also a subclass of loader which is responsible for collecting installed Pinglue packages info which will be used by HubFactory class to build a hub from those packages.
 *
 * This class represent the general behaviour of a loader. Regardless of what data the loader loads, it has a *load* method which returns a [[LoaderOutput]] object. Each loader accept a [[LoaderSettings]] object (which is extended and customized for each individual loader). Additionally, a loader is extending the native NodeJs [[EventEmitter]] class, because loader can also *watch* for changes in the project file and update its data (in the [[LoaderOutput]] object). This feature is not implemented yet, but the class arthitecture leaves room for a hot-loading feature.
 *
 * Each loader can have some other loaders as its properties, which can be called its *sub-loaders* as if. For example, the Pinglue registry class is a loader which contains otehr sub-loaders such as InfoLoader, ChannelLoader, ModuleLoader, etc. Some of these sub-loaders also have their on sub-loaders and so on. So this way we can break a big loader into smaller units and focus on each individually.Each loader has to handle the errors of its sub-loaders, and throws its own errors outside (to be handled by its parents if available).
 */
export abstract class Loader extends EventEmitter {

    protected settings: LoaderSettings;
    protected print: Printer;
    protected style: Styler;

    constructor(settings?: LoaderSettings) {

        super();

        this.settings = _clone(settings || {});

        this.print = this.settings.print;
        this.style = this.settings.style;

    }

    on(
        eventName: RegistryWatchEventName,
        callback: RegistryWatchCallback
    ) {

        return super.on(eventName, callback);

    }

    emit(
        eventName: RegistryWatchEventName,
        ...args: RegistryWatchEvent[]
    ): boolean {

        return super.emit(eventName, ...args);

    }

    /**
     * Connecting a sub-loader events to this parent loader events
     * @param loader
     */
    protected proxy(loader: Loader): void {

        for(const eventName of registryWatchEventNames) {

            loader.on(eventName, event =>this.emit(
                eventName,
                event
            ));

        }

    }

    protected printWatchEvent(
        e: RegistryWatchEvent
    ): void {

        this.print.mute(`[pkg: ${e.pkgName || "NA"}]: Change on "${e.type}" - (file: ${e.filePath})\n`);

    }

    /**
     *
     * @param type
     * @param events will default to "change"
     * @returns
     */
    protected onFileChange(
        type: RegistryWatchEventType,
        events?: RegistryWatchEventName | RegistryWatchEventName[]
    ) {

        return (filePath: string) => {

            const e: RegistryWatchEvent = {
                filePath,
                pkgName: this.settings.pkgName,
                type
            };

            this.printWatchEvent(e);

            if (!events)
                events = ["change"];
            else if (typeof events === "string")
                events = [events];

            if (!events.includes("change"))
                events.push("change");

            for(const event of events)
                this.emit(event, e);

        };

    }

    /**
     * Returns the final product (loaded data)
     */
    abstract load(): Promise<any>;

    /**
     * To clean up after itself
     */
    abstract close(): Promise<void>;

    /**
     * TO BE DONE LATER
     * reloads with new settings
     * @param settings
     */
    async reload(
        settings: LoaderSettings
    ): Promise<any> {}

}