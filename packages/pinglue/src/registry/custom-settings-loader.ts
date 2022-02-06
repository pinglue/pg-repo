
import path from "path";
import chokidar from "chokidar";

import type {
    Message
} from "@pinglue/utils";

import {
    Msg,
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
    CustomSettings
} from "./index";

//======================================

interface Settings extends LoaderSettings {
    dataPath: string;
    registrySettings: RegistrySettings;
}

interface Output extends LoaderOutput {
    data: CustomSettings;
}

export class CustomSettingsLoader extends Loader {

    protected settings: Settings;

    #envPath: string;
    #envWatcher: chokidar.FSWatcher;

    #profilesPaths: string[];
    #profilesWatcher: chokidar.FSWatcher;

    constructor(settings: Settings) {

        super(settings);

        if (this.settings.registrySettings.env)
            this.#envPath = path.join(
                this.settings.dataPath,
                "--envs",
                this.settings.registrySettings.env + ".yaml"
            );

        if (this.settings.registrySettings.profiles) {

            let profiles = this.settings.registrySettings.profiles;

            if (typeof profiles === "string")
                profiles = [profiles];

            if (profiles.length > 0) {

                this.#profilesPaths = profiles.map(
                    profile => path.join(
                        this.settings.dataPath,
                        "--profiles",
                        profile + ".yaml"
                    )
                );

            }

        }

        if (this.settings
            .registrySettings
            .watchSettings
        ) {

            if (this.#envPath) {

                this.#envWatcher =
                    chokidar.watch(this.#envPath)
                        .on(
                            "change",
                            this.onFileChange(
                                "env", "change-settings"
                            )
                        );

            }

            if (this.#profilesPaths) {

                this.#profilesWatcher =
                    chokidar.watch(this.#profilesPaths)
                        .on(
                            "change",
                            this.onFileChange(
                                "profiles", "change-settings"
                            )
                        );

            }

        }

    }

    async load(): Promise<Output | undefined> {

        const paths = [];

        if (this.#profilesPaths)
            paths.push(...this.#profilesPaths);
        if (this.#envPath)
            paths.push(this.#envPath);

        if (paths.length === 0) return {data:null};

        const errors: Message[] = [];
        const warnings: Message[] = [];

        const objs = await Promise.all<Object>(paths.map(
            async p => _readYaml(p).catch(error=>{

                if (error.code ===
                    "err-yaml-file-not-found"
                )
                    warnings.push(
                        Msg.warn(
                            "warn-yaml-file-not-found",
                            error.data
                        ));

                else
                    errors.push(error);

            })
        ));

        if (errors.length > 0)
            throw Msg.error("err-loading-custom-settings-failed", {
                errors, warnings
            });

        return {
            data: _merge({}, ...objs),
            warnings
        };

    }

    async close() {

        await this.#envWatcher?.close();
        await this.#profilesWatcher?.close();

    }

}