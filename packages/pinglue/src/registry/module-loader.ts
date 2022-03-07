
import fs from "fs-extra";
import path from "path";
import chokidar from "chokidar";
import depTree from "dependency-tree";

import {
    Controller
} from "../controller.js";

import {
    Msg,
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
    RegistrySettings
} from "./project-loader";

//======================================

interface Settings extends LoaderSettings {
    filePath: string | string[];
    registrySettings: RegistrySettings;
}

interface Output extends LoaderOutput {
    data: typeof Controller;
};

export class ModuleLoader extends Loader {

    protected settings: Settings;

    #depsWatcher: chokidar.FSWatcher;

    constructor(settings: Settings) {

        super(settings);

    }

    async load(): Promise<Output> {

        const filePath = this.settings.filePath;

        let Class: typeof Controller;

        // case of controllers (single entry file)
        if (
            this.settings.pkgName !== "pinglue" &&
            !this.settings.registrySettings.noImport
        ) {

            if (typeof filePath !== "string")
                throw Msg.error("err-multiple-entryfiles", {
                    pkgName: this.settings.pkgName,
                    filePath
                });

            if (!await fs.pathExists(filePath))
                throw Msg.error("err-import-file-not-exist", {filePath});

            try {

                // TODO(#17): use some hot module mechanism
                const module = await import(
                    filePath
                );

                Class = module.default;

            }
            catch (error) {

                throw Msg.error("err-import-failed", {
                    filePath, error
                });

            }

            if (!(Class.prototype instanceof Controller)) {

                throw Msg.error("err-not-controller-instance", {filePath});

            }

        }

        if (
            this.settings
                .registrySettings
                .watchSource
        ) {

            // TODO(#18): find the project root instead
            const curAbsPath = path.resolve(".");

            this.#depsWatcher = chokidar.watch([])
                .on("change", this.onFileChange(
                    "source",
                    "change-source"
                ));

            const files: string[] = Array.isArray(filePath) ?
                filePath :
                [filePath];

            for(const fp of files) {

                // TODO(#18): replace . with project root
                const list = depTree.toList({
                    filename: fp,
                    directory: ".",
                    filter: (pathStr) =>
                        pathStr.startsWith(
                            curAbsPath
                        )
                });
                this.#depsWatcher.add(list);

            }

        }

        return {
            data: Class
        };

    }

    async close() {

        await this.#depsWatcher?.close();

    }

}
