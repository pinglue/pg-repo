
import path from "path";
import fs from "fs-extra";
import chokidar from "chokidar";

import type {
    ChannelInfo
} from "../channel";

import {
    _merge
} from "@pinglue/utils";

import {
    _readYaml
} from "./utils.js";

import {
    Loader,
    LoaderSettings,
    LoaderOutput
} from "./loader.js";

import type {
    RegistrySettings
} from "./index";

//======================================

interface Settings extends LoaderSettings {
    pkgPath: string;
    registrySettings: RegistrySettings;
}

interface Output extends LoaderOutput {
    data: Record<string, ChannelInfo>;
};

export class ChannelsLoader extends Loader {

    protected settings: Settings;

    #filePath: string;
    #fileWatcher: chokidar.FSWatcher;

    constructor(settings: Settings) {

        super(settings);

        this.#filePath = path.join(
            this.settings.pkgPath,
            "info", "routes",
            this.settings.registrySettings.route,
            "registers.yaml"
        );

        if (this.settings
            .registrySettings
            .watchSettings
        ) {

            this.#fileWatcher = chokidar.watch(this.#filePath)
                .on("change", this.onFileChange(
                    "channels-settings",
                    "change-settings"
                ));

        }

    }

    async load(): Promise<Output> {

        // TODO(#14)

        if (!await fs.pathExists(this.#filePath))
            return {data:null};

        return {
            data: await _readYaml(this.#filePath)
        };

    }

    async close() {

        await this.#fileWatcher?.close();

    }

}