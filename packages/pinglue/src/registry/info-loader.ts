
import path from "path";
import fs from "fs-extra";
import chokidar from "chokidar";

import type {
    Object
} from "@pinglue/utils";

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
    RegistrySettings,
    PackageInfo
} from "./index";

//======================================

interface Settings extends LoaderSettings {
    pkgPath: string;
    registrySettings: RegistrySettings;
}

interface Output extends LoaderOutput {
    data: {
        pkgInfo?: Object;
        pkgJson?: Object;
    };
}

export class InfoLoader extends Loader {

    protected settings: Settings;

    #pgPath: string;
    #pgWatcher: chokidar.FSWatcher;

    #pjsonPath: string;
    #pjsonWatcher: chokidar.FSWatcher;

    constructor(settings: Settings) {

        super(settings);

        this.#pgPath = path.join(
            this.settings.pkgPath,
            "pg.yaml"
        );

        this.#pjsonPath = path.join(
            this.settings.pkgPath,
            "package.json"
        );

        if (this.settings
            .registrySettings
            .watchSettings
        ) {

            this.#pgWatcher =
                chokidar.watch(this.#pgPath)
                    .on(
                        "change",
                        this.onFileChange(
                            "pg-info", "change-settings"
                        )
                    );

            this.#pjsonWatcher =
                chokidar.watch([this.#pjsonPath])
                    .on(
                        "change",
                        this.onFileChange(
                            "pkg-json", "change-settings"
                        )
                    );

        }

    }

    async load(): Promise<Output> {

        let pkgInfo: PackageInfo;

        try {

            pkgInfo = await _readYaml(this.#pgPath) ;

        }
        catch(error) {

            if (error.code !== "err-yaml-file-not-found")
                throw error;

        }

        const pkgJson = await fs.readJSON(this.#pjsonPath);

        return {data:{pkgInfo, pkgJson}};

    }

    async close() {

        await this.#pgWatcher?.close();
        await this.#pjsonWatcher?.close();

    }

}
