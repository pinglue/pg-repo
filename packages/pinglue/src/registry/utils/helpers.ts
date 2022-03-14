
import path from "path";
import fs from "fs-extra";
import yaml from "yaml";
import {findUp} from "find-up";

import type {
    Object,
    Message
} from "@pinglue/utils";

import {
    Msg,
    _default,
    _freeze,
    _merge
} from "@pinglue/utils";

import type {
    PackageInfo,
    Routes
} from "../project-loader";

//===============================

export function _normalizeRoute(str: string): string {

    str = str.trim();

    if (["", ".", "/", "./"].includes(str))
        return ".";

    if (str.startsWith("./")) return str;

    // remove all starting/trailing slashes
    let start = 0, end = str.length;
    if (str.charAt(0) === "/") start++;
    if (str.charAt(str.length - 1) === "/") end--;
    return `./${str.slice(start, end)}`;

}

// TODO: Moved to utils
/**
 * @param filePath
 * @returns json of the yaml file
 * @throws if file not found or yaml format is wrong (data format: {filePath, error}) - error code:
 * - err-yaml-file-not-found
 * - err-cannot-read-file
 * - err-yaml-parse-error
 */
export async function _readYaml<T extends Object>(
    filePath: string
): Promise<T> {

    if (!await fs.pathExists(filePath))
        throw Msg.error("err-yaml-file-not-found", {filePath});

    let str: string;

    try {

        str = (await fs.readFile(filePath)).toString();

    }
    catch(error) {

        throw Msg.error("err-cannot-read-file", {
            filePath,
            error
        });

    }

    try {

        return yaml.parse(str, {
            prettyErrors: true
        });

    }
    catch(error) {

        throw Msg.error("err-yaml-parse-error", {
            filePath,
            error
        });

    }

}

/**
 *
 * @param pkgName - null/undefined means the current project (=project root)
 * @returns
 * @throws if path not found
 */
export async function _getPkgPath(
    pkgName?: string
): Promise<string> {

    const rel = path.join(
        "node_modules",
        pkgName || "."
    );

    const res = await findUp(async dir=>{

        const hasRel = await fs.pathExists(
            path.join(dir, rel)
        );
        return hasRel && (
            pkgName ? path.join(dir, rel) : dir
        );

    }, {type:"directory"});

    if (!res)
        throw Msg.error(
            "err-path-not-found", {pkgName}
        );

    return res;

}

/**
 * Performs various checks on the package.json to determine if it's a valid pg module or not. Returns a set of warnings. In case of fatal error throws, which means this package has a serious problem and should not be considered
 * @param pkgJson
 * @throws
 */
export async function _validatePkgJson(
    pkgName: string,
    pkgJson: Object
): Promise<{warnings: Message[]}> {

    const warnings: Message[] = [];

    // name mismatch
    if (pkgJson.name !== pkgName)
        throw Msg.error("err-pkg-name-mismatch", {
            pkgName,
            pkgJsonName: pkgJson.name
        });

    // not ESM
    if (pkgJson.type !== "module")
        throw Msg.error("err-pkg-not-esm", {
            type: pkgJson.type || "common-js"
        });

    // dependencies
    const deps = Object.keys(pkgJson.dependencies || {});

    const DEPS = ["pinglue", "@pinglue/utils"];

    const missingDeps = DEPS.filter(
        x => !deps.includes(x)
    );

    if (missingDeps.length > 0)
        warnings.push(
            Msg.warn("warn-missing-deps", {missingDeps})
        );

    return {warnings};

}

/**
 * Get the full absolute path of the entry file of the given package for the given route - returns null if route is not available
 * @param pkgName
 * @param routes
 * @returns
 * @throws
 */
export async function _getFilePath(
    pkgName: string,
    route: string,
    pkgPath: string,
    routes: Routes
): Promise<string | string[]> {

    // for pinglue include all the available routes
    if (pkgName === "pinglue") {

        return [...routes.values()].map(
            info => path.resolve(
                pkgPath,
                info.path
            )
        );

    }

    const pathName = routes?.get(route)?.path;

    if (!pathName)
        throw Msg.error("err-route-not-found");

    const filePath = path.resolve(
        pkgPath,
        pathName
    );

    if (!await fs.pathExists(filePath))
        throw Msg.error("err-entry-file-not-found", {
            filePath
        });

    return filePath;

}

/**
 *
 * @param pkgName
 * @param route
 * @returns
 */
export function _getImportPath(
    pkgName: string,
    route: string
): string | null {

    if (route === null) return null;

    if (pkgName === "pinglue")
        return "pinglue";
    else
        return pkgName + route.slice(1);

}

/**
 * TODO(#16): use json schema
 * @param info
 * @returns
 * @throws when serios error
 */
export function _validatePkgInfo(
    info: PackageInfo
): {warnings: Message[]} {

    const ans: {warnings: Message[]} = {
        warnings: []
    };

    if (!info.id)
        throw Msg.error("err-id-not-found");

    return ans;

}

/**
 *
 * @param pkgPath
 * @param pkgJson
 * @returns
 * @throws
 */
export function _getRoutes(
    pkgJson: Object
): Routes {

    const ans = new Map();

    if (
        !pkgJson ||
        typeof pkgJson !== "object"
    )   return ans;

    // adding main field info
    if (pkgJson.main)
        ans.set(
            ".",
            {path: pkgJson.main}
        );

    // adding exports field info
    if (pkgJson.exports) {

        const exports: Record<string, string> =
            pkgJson.exports;

        Object.entries(exports).reduce(
            (acc, [route, pathName]) => {

                acc.set(
                    _normalizeRoute(route),
                    {path: pathName}
                );

                return acc;

            }, ans
        );

    }

    // default to index.js
    if (ans.size === 0) {

        ans.set(
            ".",
            {path: "./index.js"}
        );

    }

    // TODO(#21): merge in the routes from the pg.yaml

    return ans;

}
