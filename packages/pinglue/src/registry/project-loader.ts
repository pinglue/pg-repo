
import type {
    Message,
    Object
} from "@pinglue/utils";

import {
    Msg,
    _merge,
    _default,
    emptyPrint,
    emptyStyle
} from "@pinglue/utils";

import type {
    PgModuleSettings
} from "../pg-module";

import {Controller} from "../controller.js";

import type {
    ChannelInfo
} from "../channel";

import {
    _normalizeRoute,
    _getPkgPath
} from "./utils/helpers.js";

import {
    Loader,
    LoaderSettings,
    LoaderOutput
} from "./loader.js";

import {InfoLoader} from "./info-loader.js";
import {CustomSettingsLoader} from "./custom-settings-loader.js";
import {PkgLoader} from "./pkg-loader.js";

// ====================================================

export interface RegistrySettings extends LoaderSettings{

    // null or undefined -> no class import for controllers (useful for getting info about packages)
    route?: string;

    // defaults to dev
    env?: string;

    // list of settings profiles to be included
    profiles?: string | string[];

    watchSettings?: boolean;

    watchSource?: boolean;

    // whether to actually import the classes .automatically is set to true if route is null/undefined
    noImport?: boolean;

    // set all hub/controllers datapath to undefined
    noDataPath?: boolean;

    noChannels?: boolean;

    noSettings?: boolean;
};

// TODO: types moved begin
export type RouteInfo = {
    path: string;
    settings?: Object;
    runtimeDependencies?: string[];
    disabled?: boolean;
    id?: string;
};

// route name format: ./term1/term2
export type Routes = Map<string, RouteInfo>;

// format of pg.yaml of packages
export type PackageInfo = {

    // id of the plugin or the parent plugin in case of sub controllers
    id: string;

    // for sub controllers
    sctId?: string;

    // ui descriptions
    title?: string;
    description?: string;

    // defaults to plugin - this field is mainly for description, not having real effect on the program (system plugins are defined in the security field of the hub settings)
    type?: "plugin" | "extension" | "system-plugin";

    settings?: Object;
    //envVars?:string[],
    //routes?: Routes
};

// format of the pg.yaml in the project root
export type ProjectSettings = {
    dataPath?: string;
};

// general structure of env and profile files data
export type CustomSettings = {
    [pkgName: string]: Object;
};
// types moved end

export type PackageRecord = {
    info?: PackageInfo;
    settings?: PgModuleSettings;
    channels?: Record<string, ChannelInfo>;
    importPath?: string;
    filePath?: string | string[];
    ClassRef?: typeof Controller;
    routes?: Routes;
    loadError?: Message;
    channelsLoadError?: Message;
};

export type RegistryWatchEventType =

"source" |          // source code
"local-settings" |  // data/pkgName/settings.yaml
"pg-info" |         // pg.yaml of the package
"pkg-json" |        // package.json
"channels-settings" | // yaml files in channels folder
"project-info" | // project root pg.yaml
"env" |     // env setting file
"profiles"; // profile file(s)

export type RegistryWatchEvent = {
    filePath?: string;
    pkgName?: string;   // not set for the project - only set for installed packages on the project
    type?: RegistryWatchEventType;

};

export type RegistryWatchCallback = (event: RegistryWatchEvent) => void;

export type RegistryWatchEventName = "change" | "change-source" | "change-settings";

export const registryWatchEventNames:
readonly RegistryWatchEventName[] = Object.freeze([
    "change",
    "change-source",
    "change-settings"
]);

enum STATE {
    init,
    loading,
    loaded
}

interface Output extends LoaderOutput {
    data: Map<string, PackageRecord>;
}

export class Registry extends Loader {

    static WATCH_EVENT_NAMES: RegistryWatchEventName[] = [
        "change",
        "change-source",
        "change-settings"
    ];

    declare protected settings: RegistrySettings;

    #route: string;
    #state = STATE.init;

    #projectRootPath: string;
    #projectInfo: Object;
    #projectPkgJson: Object;
    #dataPath: string;
    #customSettings?: CustomSettings;
    #packages: Map<string, PackageRecord> = new Map();

    #infoLoader: InfoLoader;
    #customSettingsLoader: CustomSettingsLoader;
    #pkgLoaders: Map<string, PkgLoader> = new Map();

    constructor(settings?: RegistrySettings) {

        // defaulting settings
        super(_default({}, settings, {
            print: emptyPrint,
            style: emptyStyle
        }));

        // route provided
        if (typeof this.settings?.route === "string") {

            this.#route = _normalizeRoute(
                this.settings.route
            );

        }
        // no route provided
        else {

            this.#route = null;
            this.settings.noImport = true;

        }

    }

    /**
     *
     * @returns
     * @throws (but also prints out the error report)
     */
    async load(): Promise<Output> {

        // state management, no concurrent loading
        if (this.#state === STATE.loading) return;
        this.#state = STATE.loading;

        try {

            const ans = await this.loadHelper();
            this.#state = STATE.loaded;
            this.print(this.style.hlRev("\n\nRegistry Ending\n\n"));
            return ans;

        }
        catch(error) {

            this.#state = STATE.init;
            this.print.error("Loading failed: ", error);
            throw error;

        }

    }

    async loadHelper(): Promise<Output> {

        /* loading project info
        ---------------------------- */

        const routeMsg = (this.#route !== null) ?
            ` (for route "${this.#route}")` : " (no route)";

        this.print(this.style.hlRev(`\n\nRegistry starting${routeMsg}\n\n`));

        this.print.header(
            "\n\nLoading project info\n\n"
        );

        // project root
        this.#projectRootPath = await _getPkgPath();
        this.print.mute(`Project root: ${this.#projectRootPath}\n`);

        // loading project info
        await this.#infoLoader?.close();
        this.#infoLoader = new InfoLoader({
            pkgPath: this.#projectRootPath,
            registrySettings: this.settings,
            print: this.print,
            style: this.style
        });
        this.proxy(this.#infoLoader);
        const infoLoaderO = await this.#infoLoader.load();

        infoLoaderO.warnings?.forEach(warn=>this.print(warn));
        this.#projectInfo = infoLoaderO.data.pkgInfo;
        this.#projectPkgJson = infoLoaderO.data.pkgJson;

        // TODO(#15): validating pkg json of the project
        this.print.mute(`Package name: ${this.#projectPkgJson.name}\n`);

        // no data path!
        if (
            this.#projectInfo &&
            this.#projectInfo.dataPath === null
        ) {

            this.print.warn("Data path is disabled, registry will not load settings", {projectSettings: this.#projectInfo});

            if (!this.settings.noSettings)
                throw Msg.error("err-data-path-disabled-non-project");
            else
                this.#dataPath = null;

        }
        // data path
        else
            this.#dataPath =
                this.#projectInfo?.dataPath || "data";

        /* loading custom settings
        ------------------------------- */

        this.#customSettings = null;

        if (!this.settings.noSettings) {

            this.print.mute(`Loading project custom settings (env: "${this.settings.env || "NA"}" - profiles: "${this.settings.profiles || "NA"}")\n`);

            await this.#customSettingsLoader?.close();
            this.#customSettingsLoader = new CustomSettingsLoader({
                dataPath: this.#dataPath,
                registrySettings: this.settings,
                print: this.print,
                style: this.style
            });
            this.proxy(this.#customSettingsLoader);
            const csO = await this.#customSettingsLoader.load();
            csO.warnings?.forEach(warn => this.print(warn));
            this.#customSettings = csO.data;

        }

        /* loading packages
        ---------------------------- */

        this.print.header(
            "\n\nExtracting installed pinglue packages info\n\n"
        );

        this.#packages.clear();
        let count = 0;

        // clearing pkg loaders
        await this.#clearPkgLoaders();

        for (const pkgName of Object.keys(
            this.#projectPkgJson.dependencies || {}
        )) {

            this.print(
                `\nLoading the package "${pkgName}" ... \n`
            );

            const pkgLoader = new PkgLoader({
                pkgName,
                route: this.#route,
                dataPath: this.#dataPath,
                registrySettings: this.settings,
                customSettings: this.#customSettings,
                print: this.print,
                style: this.style
            });

            let record: PackageRecord;

            try {

                record = (await pkgLoader.load()).data;

            }
            catch(error) {

                this.print.error("Failed!", error);

            }

            if (record) {

                this.#pkgLoaders.set(pkgName, pkgLoader);
                this.#packages.set(pkgName, record);
                this.proxy(pkgLoader);

            }
            count++;

        }

        this.print(`\n${this.style.hl(this.#packages.size)} Pinglue packages discovered (out of total ${this.style.hl(count)}) \n`
        );

        return {data:this.#packages};

    }

    async #clearPkgLoaders() {

        await Promise.all<void>([...this.#pkgLoaders.values()].map(
            async ld => ld.close()
        ));
        this.#pkgLoaders.clear();

    }

    async close() {

        await Promise.all([
            this.#infoLoader.close(),
            this.#customSettingsLoader.close(),
            this.#clearPkgLoaders()
        ]);

    }

    get route(): string {

        return this.#route;

    }

}
