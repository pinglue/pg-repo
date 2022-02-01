
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

export interface LoaderSettings {

    pkgName?: string,

    // defaults to empty printer at Registry, other loaders inherit from their parent loader
    print?: Printer; 

    // defaults to empty styler at Registry, other loaders inherit from their parent loader
    style?: Styler; 
    
}

export interface LoaderOutput {
    data: Object;
    warnings?: Message[]
}

export abstract class Loader extends EventEmitter { 

    protected settings: LoaderSettings;
    protected print: Printer;
    protected style: Styler;

    constructor(settings?: LoaderSettings) {

        super();

        this.settings = _clone(settings||{});

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
    ):boolean {

        return super.emit(eventName, ...args);
    }

    /**
     * Connecting a sub-loader events to this loader events
     * @param loader 
     */
    protected proxy(loader:Loader):void {

        for(const eventName of registryWatchEventNames) {
            loader.on(eventName, event =>this.emit(
                eventName,
                event
            ));
        }

    }

    /*protected newSubLoader<T extends Loader>(
        settings: LoaderSettings,
        Constructor: typeof Loader
    ):T {

        const sl = new Constructor(settings) as T;
        this.proxy(sl);
        return sl;

    }*/

    protected printWatchEvent(
        e: RegistryWatchEvent
    ): void {

        this.print.mute(`[pkg: ${e.pkgName||"NA"}]: Change on "${e.type}" - (file: ${e.filePath})\n`);

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

            const e:RegistryWatchEvent = {
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

        }
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
    ):Promise<any> {}


}