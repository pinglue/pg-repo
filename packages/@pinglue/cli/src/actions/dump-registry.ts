
import {Registry} from "pinglue";

import type {
    CliActionSettings
} from "../cli-settings";

import {filterMatch} from "../utils/filter-match.js";

type Options = {
    env?: string;
    profiles?: string | string[];
    filter?: string;

    import?: boolean;
    dataPath?: boolean;
    channels?: boolean;
    settings?: boolean;
};

export default function(settings: CliActionSettings) {

    const {print, style} = settings;

    return async(
        route: string, options: Options
    ) => {

        route = route || "/";

        const registry = new Registry({
            route,
            env:options.env || "local",
            profiles: options.profiles || "dev",

            noImport: !options.import,
            noDataPath: !options.dataPath,
            noChannels: !options.channels,
            noSettings: !options.settings,

            print,
            style
        });

        print(`\n\nDumping the registry for route: "${route}"\n`);

        print.mute(`Env -> ${options.env || "NA"}\n`);
        print.mute(`Profiles -> ${options.profiles || "NA"}\n`);

        //let ans;

        try {

            const ans = await registry.load();

            if (!ans?.data) {

                print.error("Empty data field in the registery's response", {ans});
                return;

            }          
            
            print.header("\n\nRegistry records dump:\n");
            print.header("=".repeat(80) + "\n\n");

            for(const [pkgName, record] of ans.data) {

                if (!filterMatch(pkgName, options.filter))
                    continue;

                print(style.warn(pkgName) + "\n");
                print("-".repeat(80) + "\n");
                print(style.obj(record));
                print("\n\n");

            }            

        }
        catch(error) {

            print.error("Failed!");
            return;

        }

    };

}