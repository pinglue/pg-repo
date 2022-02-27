
import {createApp} from "pinglue";
import {printLog} from "@pinglue/print/node";

import type {
    CliActionSettings
} from "../cli-settings";

//===================================

type Options = {
    silent?: boolean;
    printLogs?: boolean;
    fileLog?: boolean;
    env?: string;
    profiles?: string | string[];
};

// TODO: implement the file log case

export default function(settings: CliActionSettings) {

    const {print, style} = settings;

    return async(routeName, options: Options) => {

        routeName = routeName || "/";

        print.header(`\nRunning the route "${routeName}"\n\n`);

        let localLoggers;
        if (options.printLogs)
            localLoggers = printLog;

        const printersInfo = {};
        if (!options.silent)
            Object.assign(printersInfo, {
                print, style
            });

        try {

            const {hub} = await createApp(routeName, {
                factory: {
                    ...printersInfo,
                    env: options.env || "local",
                    profiles: options.profiles || "dev"
                },
                hub: {localLoggers}
            });

            print.header("\nStarting the hub ... \n\n");

            await hub.start();

        }
        catch (error) {

            print.error("Pinglue create app failed: ", error);

        }

    };

}
