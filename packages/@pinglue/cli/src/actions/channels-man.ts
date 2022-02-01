
import {Registry} from "pinglue";
import {_merge} from "@pinglue/utils";

import type {
    CliActionSettings
} from "../cli-settings";

import {channelReport} from "../utils/channel-report.js";

//=============================================

type Options = {
    pkg?: string;
    channel?: string;
    full?: boolean;
    env?: string;
    profiles?: string | string[]

};

export default function(settings: CliActionSettings) {

    const {print, style} = settings;

    return async(route, options: Options) => {

        route = route || "/";

        const registry = new Registry({
            route,
            noImport: true,
            env:options.env || "local",
            profiles: options.profiles || "dev"
        });

        let count = 0;

        print.mute(`\nChannels manual (route: ${route})\n${"=".repeat(80)}\n`);

        const {data: packages} = await registry.load();

        for(const [pkgName, record] of packages) {

            // package filter
            if (
                options.pkg &&
                pkgName !== options.pkg
            )   continue;

            if (!options.channel) {

                print.header(`\nPackage: ${pkgName}\n\n`);

                if (record.channelsLoadError) {

                    if (
                        record.channelsLoadError.code ===
                        "err-dir-not-found"
                    ) {

                    }

                    switch(record.channelsLoadError.code) {

                        case "err-dir-not-found":
                            print.mute(`Channels dir not found (${record.channelsLoadError.data.dirPath})\n\n`);
                            break;

                        case "err-yaml-file-not-found":
                            print.mute(`Channels yaml not found (${record.channelsLoadError.data.filePath})\n\n`);
                            break;

                        case "err-cannot-read-file":
                            print.error(`Cannot read file (${record.channelsLoadError.data.filePath})`, record.channelsLoadError.data.error);
                            break;

                        case "err-yaml-parse-error":

                            print(style.errorRev(record.channelsLoadError.data.error.name));

                            print.mute(` (${record.channelsLoadError.data.filePath})\n`);

                            print(record.channelsLoadError.data.error.message + "\n");

                            /*print(`Node type: ${record.channelsLoadError.data.error.nodeType}\n`);
                            print(`Line: ${record.channelsLoadError.data.error.linePos.start.line}:${record.channelsLoadError.data.error.linePos.start.col}\n`);*/

                            break;

                    }

                    continue;

                }

            }

            if (!record.channels) continue;

            for(const [channelName, info] of
                Object.entries(record.channels)) {

                // channel filter
                if (
                    options.channel &&
                    channelName !== options.channel
                )   continue;

                _merge(info, {
                    settings: {
                        controllerId: record.info.id
                    }
                });

                channelReport(
                    channelName,
                    info,
                    {
                        full: options.full,
                        noErrOnNoReducer: true,
                        noHandlers: true,
                        noErrOnNoCt: true
                    },
                    print,
                    style
                );

                count++;

            }

        }

        print.mute("\n" + "=".repeat(80) + "\n");
        print(`Total channels: ${count}\n\n`);

    };

}