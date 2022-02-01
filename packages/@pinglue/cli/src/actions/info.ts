
import type {
    RegistrySettings,
    PackageRecord,
    Routes
} from "pinglue";

import {Registry} from "pinglue";

import type {
    Printer,
    Styler
} from "@pinglue/utils";

import type {
    CliActionSettings
} from "../cli-settings";

type Options = {
    env?: string;
    profiles?: string | string[];
    pkg?: string;
};

type InfoSegment = {
    title: string;
    content: string;
};

type PkgInfo = {
    id?: string;
    disabled?: boolean;
    error?: boolean;
    infos: InfoSegment[];
};

export default function(settings: CliActionSettings) {

    const {print, style} = settings;

    return async(routeName, options: Options) => {

        let info;

        try {

            info = await getGeneralInfo(
                routeName,
                options,
                style, print,
                {
                    noRoutes: typeof routeName !== "undefined"
                }
            );

        }
        catch(error){

            print.error("failed", error);

        }

        if (typeof routeName === "undefined")
            print.header("\nGeneral packages info\n\n");
        else
            print.header(`\nPackages info for the route "${routeName || "/"}"\n\n`);

        if (info.size === 0) {

            print("No package found!\n\n");
            return;

        }

        for(const [pkgName, pkgInfo] of info) {

            if (pkgInfo.error)
                print.error(pkgName + " (failed)");

            else if (pkgInfo.disabled)
                print.mute(pkgName + " (disabled)");

            else
                print.header(pkgName);

            if (pkgInfo.id) {

                print(" --- " + style.mute("id: ") + style.header(pkgInfo.id));

            }

            print("\n" + "=".repeat(80) + "\n\n");

            pkgInfo.infos.forEach(({title, content})=>{

                print(style.hl(title) + content + "\n\n");

            });

            print("\n\n");

        }

        print(`Packages: ${info.size}`);

    };

}

async function getGeneralInfo(
    routeName: string,
    cliOptions: Options,
    style: Styler, print: Printer,
    options: {noRoutes?: boolean}
): Promise<Map<string, PkgInfo>> {

    const settings: RegistrySettings = {
        route: routeName,
        env: cliOptions.env || "local",
        profiles: cliOptions.profiles || "dev",
        style,
        print
    };

    const reg = new Registry(settings);
    const {data: packages} = await reg.load();

    const ans = new Map<string, PkgInfo>();

    if (cliOptions.pkg) {

        if (packages.has(cliOptions.pkg)) {

            ans.set(
                cliOptions.pkg,
                _getPkgInfo(packages.get(cliOptions.pkg), style, options)
            );

        }

        return ans;

    }

    for(const [pkgName, record] of packages) {

        ans.set(
            pkgName,
            _getPkgInfo(record, style, options)
        );

    }

    return ans;

}

function _getPkgInfo(
    record: PackageRecord,
    style: Styler,
    options: any
): PkgInfo {

    const infos: InfoSegment[] = [];

    if (record.loadError) {

        infos.push({
            title: "ERROR!\n",
            content: style.errorObj(record.loadError)
        });

        return {
            id: record?.info?.id,
            error: true,
            infos
        };

    }

    // import path
    if (record.importPath) {

        infos.push({
            title: "Import path: ",
            content: record.importPath
        });

    }

    // routes
    if (!options.noRoutes && record.routes) {

        infos.push({
            title: "Routes:\n",
            content: _routesStr(record.routes, style)
        });

    }

    //settings
    if (record.settings) {

        infos.push({
            title: "Settings:\n",
            content: style.obj(record.settings)
        });

    }

    return {
        id: record.info?.id,
        disabled: record.settings?.disabled,
        infos
    };

}

function _routesStr(routes: Routes, style: Styler): string {

    return Array.from(
        routes,
        ([name, info])=>name + style.mute(` => ${info.path}`)
    ).join("\n");

}
