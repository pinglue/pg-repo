
import fs from "fs";
import yaml from "yaml";

import {_merge} from "@pinglue/utils";
import {Registry} from "pinglue";

import type {
    CliActionSettings
} from "../cli-settings";

type Options = {
    name?: string;
    show?: boolean;
};

export default function(settings: CliActionSettings) {

    const {print, style} = settings;

    return async(options: Options) => {

        const filename = _getFilename(options.name);

        print.header("\nGenerating env template");

        if (!options.show) {

            print(` into the file: ${style.hl(filename)}`);

        }

        print("\n\n");

        const reg = new Registry();
        const {data: packages} = await reg.load();

        const jsonAns = {};

        for (const [pkgName, record] of packages) {

            jsonAns[pkgName] = {};

        }

        // see if the file alraedy exists, then merge
        if (filename) {

            try {

                const str = fs.readFileSync(filename);
                const prev = yaml.parse(str.toString());

                // removing all null top-level keys from prev
                for (const [key, value] of Object.entries(prev)) {

                    if (value === null) delete prev[key];

                }
                _merge(jsonAns, prev);

            }
            catch (error) {}

        }

        const ans = yaml.stringify(jsonAns);

        if (options.show) {

            print(style.hl(">".repeat(80) + "\n\n"));
            print(ans);
            print(style.hl("\n\n" + ">".repeat(80) + "\n\n"));

        }
        else {

            fs.writeFileSync(
                filename,
                ans
            );

        }

    };

}

function _getFilename(envName?: string | null): string {

    if (!envName) return "env.yaml";
    else return `env-${envName}.yaml`;

}