
import path from "path";
import chokidar from "chokidar";

import type {
    Object
} from "@pinglue/utils";

import {
    _merge
} from "@pinglue/utils";

import {
    _readYaml
} from "./utils/helpers.js";

import {
    Loader,
    LoaderSettings,
    LoaderOutput
} from "./loader.js";

import type {
    RegistrySettings,
    CustomSettings,
    PackageInfo
} from "./project-loader";

import {
    defaultValue
} from "./json-schema.js";

//================================

interface Settings extends LoaderSettings {
    pkgName: string;
    pkgInfo: PackageInfo;
    dataPath: string;
    customSettings?: CustomSettings;
    registrySettings: RegistrySettings;
}

/**
 * Holding the global settings of a specific package (global settings = default <- local <-custom (profile <- env) )
 */
export class SettingsLoader extends Loader {

    declare protected settings: Settings;

    #defaultSettings: Object = {};
    #localSettings: Object = {};
    #localSettingsPath: string;
    #localSettingsWatcher: chokidar.FSWatcher;

    constructor(settings: Settings) {

        super(settings);

        this.#localSettingsPath = path.join(
            this.settings.dataPath,
            this.settings.pkgName,
            "settings.yaml"
        );

        if (this.settings.pkgInfo.settings)
            this.#defaultSettings = defaultValue(
                this.settings.pkgInfo.settings
            ) as Object;

        if (this.settings
            .registrySettings
            .watchSettings
        ) {

            this.#localSettingsWatcher
                = chokidar.watch(this.#localSettingsPath)
                    .on(
                        "change",
                        this.onFileChange(
                            "local-settings", "change-settings"
                        )
                    );

        }

    }

    /**
     *
     * @param pkgName
     * @throws
     */
    async #loadLocalSettings(): Promise<void> {

        try {

            this.#localSettings = await _readYaml(
                this.#localSettingsPath
            );

        }
        catch(error) {

            if (error.code === "err-yaml-file-not-found")
                this.#localSettings = {};
            else
                throw error;

        }

    }

    /**
     * Computes the ultimate settings for this package - returns deep cloned, no side effects
     * @throws
     */
    async load(): Promise<LoaderOutput> {

        await this.#loadLocalSettings();

        return {data: _merge({},
            this.#defaultSettings,
            this.#localSettings,
            this.settings.customSettings?.[this.settings.pkgName]
        )};

    }

    async close() {

        await this.#localSettingsWatcher?.close();

    }

}