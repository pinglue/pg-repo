
import type {
    Printer,
    Styler
} from "@pinglue/utils";

import type {
    ChannelReport
} from "pinglue";

export function channelReport(
    channelName: string,
    report: ChannelReport,
    options: {
        full?: boolean;
        noErrOnNoReducer?: boolean;
        noHandlers?: boolean;
        noErrOnNoCt?: boolean;
    },
    print: Printer,
    style: Styler
): void {

    const settings = report.settings || {};

    print("\n " + style.error("-> ") + style.hl(channelName));

    if (settings.runMode) {

        print(" - ");
        print(style.warn(`(${settings.runMode})`));

    }

    if (settings.singleHandler)
        print(" | " + style.info("single-hdl"));
    if (settings.syncType === "async")
        print(" | " + style.info("async"));
    if (settings.syncType === "sync")
        print(" | " + style.info("sync"));
    if (settings.noEmpty)
        print(" | " + style.info("no-empty"));
    if (settings.externallyHandled)
        print(" | " + style.warn("Ext-hdl"));
    if (settings.externallyRun)
        print(" | " + style.warn("Ext-run"));

    if (settings.noCloneParams)
        print(" | " + style.error("no-clone-params"));
    if (settings.noCloneValue)
        print(" | " + style.error("no-clone-value"));

    print("\n\n");

    if (settings.proxy) {

        print(" " + style.warn("  PROXY"));
        if (typeof settings.proxy === "object")
            print.mute(` (to "${settings.proxy.channelName || "NA"}" of "${settings.proxy.hubId || "NA"}" hub)`);

        print("\n\n");

    }

    // controller
    print.mute("  Registered by: ");
    if (settings.controllerId)
        print(settings.controllerId);
    else if (!options.noErrOnNoCt)
        print(style.errorRev("Not registered"));
    else
        print("N/A");

    print("\n\n");

    // description
    if (options.full && report.description) {

        print.mute("  Description: ");
        print(report.description);
        print("\n\n");

    }

    // params/value/return
    if (options.full) {

        for(const item of [
            "params", "value", "return"
        ]) {

            if (!report[item]) continue;
            print.mute(`  ${item}:\n`);
            print(style.obj(report[item]));
            print("\n\n");

        }

    }

    // reducer

    print.mute("  Reducer: ");
    if (typeof settings.reducer === "string")
        print(settings.reducer);
    else if (typeof settings.reducer === "function")
        print("Custom function");
    else if (!options.noErrOnNoReducer)
        print.error("Invalid reducer!", {reducer:settings.reducer});

    print("\n\n");

    if (!options.noHandlers) {

        print.mute("  Handlers:\n");

        // no empty warning
        if (
            report.settings.noEmpty &&
            report.handlers.length === 0 &&
            !settings.externallyHandled
        )   print("  " + style.errorRev("No handler\n\n"));

        if (report.handlers) {

            [...report.handlers]
                .sort((a, b)=>a.controllerId.localeCompare(b.controllerId))
                .forEach((item) => {

                    print(
                        "     " +
                        item.controllerId +
                        style.mute(` (-> ${item.functionName})`) +
                        "\n"
                    );

                });

        }

    }

}