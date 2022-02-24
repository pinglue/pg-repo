
// TODO: shall we use prettier instead?
import beautify from "js-beautify";
import fs from "fs-extra";

import type {
    FactorySettings,
    GenCodeSettings
} from "pinglue";

import {Factory} from "pinglue";

import type {
    CliActionSettings
} from "../cli-settings";

type Options = {
    silent?: boolean;
    output?: string;
    printLogs?: boolean;
    fileLog?: boolean;
    env?: string;
    browser?: boolean;
    profiles?: string | string[];
};

// TODO: implement the file log case

export default function(settings: CliActionSettings) {

    const {print, style} = settings;

    return async(routeName, options: Options) => {

        routeName = routeName || "/";

        print.header(`\nGenerating code for the route "${routeName}"\n\n`);

        const factorySettings: FactorySettings = {
            env:options.env || "local",
            profiles: options.profiles || "dev"
        };

        if (!options.silent)
            Object.assign(factorySettings, {print, style});

        const factory = new Factory(routeName, factorySettings);

        await factory.init();

        const codeGenSettings: GenCodeSettings = {};

        if (options.browser)
            codeGenSettings.hubPkgName = "pinglue/browser";

        if (options.printLogs) {

            codeGenSettings.localLoggerImports = {
                name: "printLog",
                path: "@pinglue/print" + ((options.browser) ? "/browser" : "")
            };

        }
        // TODO: do the log file

        let code = `
        ${factory.genCodeImports(codeGenSettings).code}

        (async ()=>{

            ${factory.genCodeHubConstruction(codeGenSettings).code}

            ${factory.genCodeCtRegs(codeGenSettings).code}

            ${factory.genCodeInitHub(codeGenSettings)}

            ${factory.genCodeStartHub(codeGenSettings)}

        })();

        `;

        code = beautify(code, {
            indent_size: 2, space_in_empty_paren: true
        });

        print(
            style.header("\nCode:\n===================================\n\n") +
            code +
            style.header("\n\n===================================\n\n")
        );

        if (options.output)
            await fs.writeFile(options.output, code);

    };

}
