
import path from "path";

import {
    Msg,
    _merge,
    _default
} from "@pinglue/utils";

import type {
    RegistrySettings,
    PackageRecord,
    CustomSettings,
    PackageInfo
} from "./project-loader";

import {
    Loader,
    LoaderSettings,
    LoaderOutput
} from "./loader.js";

import {
    _readYaml,
    _getPkgPath,
    _validatePkgJson,
    _getFilePath,
    _getImportPath,
    _validatePkgInfo,
    _getRoutes
} from "./utils/helpers.js";

import {InfoLoader} from "./info-loader.js";
import {ChannelsLoader} from "./channels-loader.js";
import {SettingsLoader} from "./settings-loader.js";
import {ModuleLoader} from "./module-loader.js";

//===================================

interface Settings extends LoaderSettings {
    route: string | null;
    dataPath: string;
    registrySettings: RegistrySettings;
    customSettings?: CustomSettings;
}

interface Output extends LoaderOutput {
    data: PackageRecord;
}

export class PkgLoader extends Loader {

    declare protected settings: Settings;

    #infoLoader: InfoLoader;
    #channelsLoader: ChannelsLoader;
    #settingsLoader: SettingsLoader;
    #moduleLoader: ModuleLoader;

    constructor(settings: Settings) {

        super(settings);

    }

    async load(): Promise<Output> {

        const route = this.settings.route;
        const pkgName = this.settings.pkgName;
        const registrySettings = this.settings.registrySettings;
        const dataPath = this.settings.dataPath;
        const print = this.print;
        const style = this.style;

        const pkgPath = await _getPkgPath(pkgName);

        this.print.mute(`\t(path: ${pkgPath})\n`);

        // final answer
        const record: PackageRecord = {};

        /* loading package info
        -------------------------*/

        this.print.mute("\tloading package info: ");

        await this.#infoLoader?.close();
        this.#infoLoader = new InfoLoader({
            pkgName,
            pkgPath,
            registrySettings,
            print,
            style
        });
        this.proxy(this.#infoLoader);

        const {pkgInfo, pkgJson} =
            (await this.#infoLoader.load()).data as {pkgInfo?: PackageInfo; pkgJson?: Object};

        // no pg.yaml found - skip this package
        if (!pkgInfo) {

            this.print("pg.yaml not found\n");
            return {data:null};

        }

        // validation
        if (pkgName !== "pinglue") {

            let warnings = _validatePkgInfo(pkgInfo).warnings;
            warnings?.forEach(warn=>this.print(warn));
            warnings
                = (await _validatePkgJson(pkgName, pkgJson)).warnings;
            warnings?.forEach(warn=>this.print(warn));

        }
        record.info = pkgInfo;
        this.print(this.style.success("Done!\n"));

        /* loading routes info
        ----------------------------- */

        this.print.mute("\tgettings routes info: ");

        try {

            record.routes = _getRoutes(pkgJson);
            this.print(this.style.success("Done!\n"));

        }
        catch(error) {

            this.print(this.style.error("Failed!\n"));

            // in general case return load error
            if (route === null)
                return {data: {
                    ...record,
                    loadError: error
                }};
            // when route is specified, skip this package
            else throw error;

        }

        // whether this package has route info for this registry
        if (
            route !== null &&
			pkgName !== "pinglue"
        ) {

            this.print.mute("\tchecking routes info: ");

            if (!record.routes?.get(route)?.path) {

                this.print("The target route is not defined in this package\n");

                return {data:null};

            }
            else
                this.print(this.style.success("Done!\n"));

        }

        // computing import path
        record.importPath = _getImportPath(pkgName, route);

        // gettings file path
        // TODO(#19): make filePath to be array as well, some packages, partoicularly pinglue, have more than one entry file. Then apply this change to pinglue package (so that the watch source can watch all the files there)
        if (
            route !== null
        ) {

            try {

                this.print.mute("\tGetting package entry file: ");
                record.filePath = await _getFilePath(
                    pkgName, route, pkgPath, record.routes
                );
                this.print(this.style.success("Done!\n"));

            }
            catch(error) {

                if (error.code === "err-entry-file-not-found")
                    this.print(this.style.error("Failed!") + " Not found\n");

                return {data:{
                    ...record,
                    loadError: error
                }};

            }

        }

        /* loading channel settings
        ------------------------------ */

        if (
            route !== null &&
            !registrySettings.noChannels &&
			pkgName !== "pinglue"
        ) {

            this.print.mute("\tloading channels info: ");

            await this.#channelsLoader?.close();
            this.#channelsLoader = new ChannelsLoader({
                pkgName,
                pkgPath,
                registrySettings,
                print,
                style
            });
            this.proxy(this.#channelsLoader);

            try {

                record.channels =
                    (await this.#channelsLoader.load()).data;

                if (record.channels === null)
                    this.print.mute("Not found\n");
                else
                    this.print(this.style.success("Done!\n"));

            }
            catch(error) {

                record.channelsLoadError = error;
                this.print.warn("Invalid channels info", error);

            }

        }

        /* loading settings
        ----------------------- */

        if (
            !registrySettings?.noSettings
        ) {

            this.print.mute("\tloading settings: ");

            await this.#settingsLoader?.close();
            this.#settingsLoader = new SettingsLoader({
                pkgName,
                pkgInfo,
                dataPath,
                registrySettings,
                customSettings: this.settings.customSettings,
                print,
                style
            });
            this.proxy(this.#settingsLoader);

            try {

                record.settings =
                    (await this.#settingsLoader.load()).data;

                this.print(this.style.success("Done!\n"));

            }
            catch(error) {

                this.print(this.style.error("Failed!\n"));
                return {data: {
                    ...record,
                    loadError: error
                }};

            }

            // adding channels info
            if (record.channels) {

                record.settings.__channels =
                    Object.entries(record.channels).reduce(
                        (acc, [name, info]) => {

                            acc[name] = info?.settings || {};
                            return acc;

                        }, {}
                    );

            }

            // assigning package info
            if (pkgName !== "pinglue") {

                record.settings.__pkgInfo = {
                    name: pkgName
                };

            }

            // adding data path info
            if (
                !registrySettings.noDataPath &&
                pkgName !== "pinglue"
            ) {

                record.settings.__dataPath = path.join(
                    dataPath, pkgName
                );

            }

        }

        /* loading classref
        ------------------------ */

        // TODO(#20): this condition excludes pinglue package, we still need to watch pinglue source ... (but do we? ...)
        if (
            route !== null
        ) {

            this.print.mute("\timporting controller: ");

            await this.#moduleLoader?.close();

            if (!record.filePath) {

                this.print(this.style.error("Failed!") + " No entry path found\n");
                return {data:null};

            }

            this.#moduleLoader = new ModuleLoader({
                pkgName,
                filePath: record.filePath,
                registrySettings,
                print,
                style
            });
            this.proxy(this.#moduleLoader);

            try {

                record.ClassRef =
                    (await this.#moduleLoader.load()).data;
                this.print(this.style.success("Done!\n"));

            }
            catch(error) {

                //this.print(this.style.error("Failed!\n"));
                this.print.error("Failed!", error);
                return {data:{
                    ...record,
                    loadError: error
                }};

            }

        }

        return {data:record};

    }

    async close() {

        await Promise.all<void>([
            this.#infoLoader.close(),
            this.#channelsLoader.close(),
            this.#settingsLoader.close(),
            this.#moduleLoader.close()
        ]);

    }

}