
import {Registry} from "pinglue";

import type {
    CliActionSettings
} from "../cli-settings";

type Options = {
    env?: string;
    profiles?: string | string[];
    pkg?: string;

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

            if (options.pkg) {

                const data = ans.data.get(options.pkg);

                if (!data) {

                    print(`No record found for the package "${options.pkg}"\n\n`);
                    return;

                }

                print.header(`\n\nRegistry record dump for package "${options.pkg}":\n`);
                print.header("=".repeat(80) + "\n\n");
                print(style.obj(data));

            }
            else {

                print.header("\n\nRegistry records dump:\n");
                print.header("=".repeat(80) + "\n\n");

                for(const [pkgName, record] of ans.data) {

                    print(style.warn(pkgName) + "\n");
                    print("-".repeat(80) + "\n");
                    print(style.obj(record));
                    print("\n\n");

                }

            }

        }
        catch(error) {

            print.error("Failed!");
            return;

        }

    };

}