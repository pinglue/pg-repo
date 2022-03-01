
import {setProperty} from "dot-prop";
import type {PackageRecord} from "../registry/project-loader";
import type {Object} from "@pinglue/utils";
import {_merge} from "@pinglue/utils";

export interface TestPackageInfo {

    // package name
    name: string;

    version?: string;

    // package main field
    main?: string;

    // package exports field
    exports?: Record<string, string>;

    // pg.yaml
    pgYaml?: string;

    // all settings are in yaml - only contain the settings for this package at the top level
    localSettings?: string;
    envSettings?: Record<string, string>;
    profileSettings?: Record<string, string>;

    // additional file structure (other than those generated by info above such as package.json, etc) - will overwrite above generated files
    fs?: Object;

    // the package record as generated by loaders
    record?: Partial<PackageRecord>;

}

/**
 * Build a file structure (nested json) for a single package
 * @param packageInfo
 * @returns
 * @throws
 */
export function buildPackageFs(
    packageInfo: TestPackageInfo
): Object {

    if (!packageInfo.name)
        throw new Error("Package needs name: " + JSON.stringify(packageInfo));

    const pkgJson = ["name", "version", "main", "exports"].reduce(
        (acc, field) => {

            if (packageInfo[field])
                acc[field] = packageInfo[field];
            return acc;

        }, {}
    );
    pkgJson.type = "module";

    const generatedFiles = {
        "package.json": JSON.stringify(pkgJson)
    };

    if (packageInfo.pgYaml)
        generatedFiles["pg.yaml"] = packageInfo.pgYaml;

    return _merge(generatedFiles, packageInfo.fs);

}

/**
 * Build a file structure (nested json) for a project
 * @param param0
 * @returns
 */
export function buildProjectFs({
    packagesInfo = [] as TestPackageInfo[],
    dataPath = "data" as string,
    packageJson = {} as Object,
    pgYaml = null as string | null
} = {}): Object {

    const ans = {};

    // setting project pg.yaml
    if (pgYaml)
        ans["pg.yaml"] = pgYaml;

    // setting data folder
    ans[dataPath] = {};

    // defaulting project package json
    const projectPkgJson = {
        name: "pg-project",
        type: "module",
        ...packageJson
    };

    // env and profiles
    const envs = {};
    const profiles = {};

    // adding packages
    for(const info of packagesInfo) {

        const pkgDotPath = info.name.replace("/", ".");

        // adding package to node_modules
        setProperty(
            ans,
            `node_modules.${pkgDotPath}`,
            buildPackageFs(info)
        );

        // adding local settings
        if (info.localSettings) {

            setProperty(
                ans,
                `${dataPath}.${pkgDotPath}`,
                {"settings.yaml": info.localSettings}
            );

        }

        // adding env and profile
        for(const [src, dest] of [
            [info.envSettings, envs],
            [info.profileSettings, profiles]
        ]) {

            if (!src) continue;

            for(const [name, settings] of
                Object.entries(src)
            ) {

                const filename = `${name}.yaml`;
                if (!dest[filename])
                    dest[filename] = "";

                const formattedSettings = settings.split("\n")
                    .filter(line => !!line.trim())
                    .map(line => `  ${line}`)
                    .join("\n");

                dest[filename] += `"${info.name}":\n${formattedSettings}\n`;

            }

        }

        // adding to package json
        _merge(projectPkgJson, {
            dependencies: {
                [info.name]: info.version || "0.0.0"
            }
        });

    }

    // adding project package.json
    ans["package.json"] = JSON.stringify(projectPkgJson);

    // adding env and profile data to fs
    if (Object.keys(envs).length > 0)
        ans[dataPath]["--envs"] = envs;
    if (Object.keys(profiles).length > 0)
        ans[dataPath]["--profiles"] = profiles;

    return ans;

}