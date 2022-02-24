
import {createApp} from "pinglue";
import {channelReport} from "../utils/channel-report.js";

import type {
    CliActionSettings
} from "../cli-settings";

type Options = {
    env?: string;
    profiles?: string | string[];
};

// TODO: compare the hun report with the channels man to make sure they are exactly the same (except for the default values)

export default function(settings: CliActionSettings) {

    const {print, style} = settings;

    return async(routeName, options: Options) => {

        routeName = routeName || "/";

        const {hub} = await createApp(routeName, {
            factory: {
                env:options.env || "local",
                profiles: options.profiles || "dev"
            }
        });

        const report = hub.channelReport();
        if (!report) return;

        print.header(`\nChannels report (route: ${routeName})\n${"=".repeat(80)}\n`);

        print(`\n ${report.size} channels found\n`);

        [...report]
            .sort((a, b)=>a[0].localeCompare(b[0]))
            .forEach(([channelName, chanReport])=>channelReport(
                channelName,
                chanReport,
                {},
                print,
                style
            ));

        print.header(`\n\n${"=".repeat(80)}\n\n`);

        process.exit();

    };

}
