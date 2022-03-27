
import type {Object} from "../types";
import * as nodePath from "path";

import * as nodeFs from "fs";
import * as nodeFsPromises from "fs/promises";

export const ASYNC_FUNCS = [
    "access", "appendFile", "chmod", "chown", "copyFile",
    "lchown", "lutimes", "link", "lstat", "mkdir", "mkdtemp", "open", "opendir",
    "readdir", "readFile", "readlink", "realpath", "rename", "rmdir", "rm",
    "stat", "symlink", "truncate", "unlink", "utimes", "writeFile"
];

export const SYNC_FUNCS = [
    ...ASYNC_FUNCS
        .filter(x=>x !== "watch")
        .map(x=>`${x}Sync`),
    "closeSync", "existsSync", "fchmodSync", "fchownSync",
    "fdatasyncSync", "fstatSync", "fsyncSync", "ftruncateSync",
    "futimesSync", "readSync", "readvSync", "writeSync", "writevSync"
];

// TODO: define type for it!
export type FsModule = Object;

export function fsFactory(
    fsModule: Object = nodeFs, 
    fsPromisesModule: Object = nodeFsPromises
): FsModule {

    const fs: Object = {};

    // adding async functions
    ASYNC_FUNCS.reduce((acc, fname)=>{

        if (typeof fsPromisesModule[fname] === "function") {

            acc[fname] = fsPromisesModule[fname];

        }
        return acc;

    }, fs);

    // adding sync functions
    SYNC_FUNCS.reduce((acc, fname)=>{

        if (typeof fsModule[fname] === "function") {

            acc[fname] = fsModule[fname];

        }
        return acc;

    }, fs);

    // adding callback watch
    fs.watch = fsModule.watch;

    // pathExists
    fs.pathExists = async(path: string): Promise<boolean> => {

        return fs.access(path).then(() => true).catch(() => false);

    };
    fs.pathExistsSync = fs.existsSync;

    // read json
    fs.readJSON = async(path: string): Promise<Object> => {
        // TODO: more accurate error handling
        const str = await fs.readFile(path, "utf8");
        return JSON.parse(str);

    };

    fs.readJSONSync = (path: string): Object => {

        const str = fs.readFileSync(path, "utf8");
        return JSON.parse(str);

    };

    // write json
    fs.writeJSON = async(path: string, object: Object, options?: {mode?: number; flag?: string}): Promise<void> => {

        const str = JSON.stringify(object);
        await fs.writeFile(path, str, {...options, encoding: "utf8"});

    };

    fs.writeJSONSync = (path: string, object: Object, options?: {mode?: number; flag?: string}): void => {

        const str = JSON.stringify(object);
        fs.writeFileSync(path, str, {...options, encoding: "utf8"});

    };

    // ensureDir
    fs.ensureDir = async(path: string, options?: {mode?: number}) => {

        await fs.mkdir(path, {...options, recursive: true});

    };

    fs.ensureDirSync = (path: string, options?: {mode?: number}) => {

        fs.mkdirSync(path, {...options, recursive: true});

    };

    // ensureFile
    fs.ensureFile = async(path: string, options?: {mode?: number}) => {

        if (await fs.pathExists(path)) return;
        const filename = nodePath.basename(path);
        const dirPath = nodePath.dirname(path);
        await fs.ensureDir(dirPath, options);
        await fs.writeFile(nodePath.join(dirPath, filename), "", {...options});

    };

    fs.ensureFileSync = (path: string, options?: {mode?: number}) => {

        if (fs.pathExistsSync(path)) return;
        const filename = nodePath.basename(path);
        const dirPath = nodePath.dirname(path);
        fs.ensureDirSync(dirPath, options);
        fs.writeFileSync(nodePath.join(dirPath, filename), "", {...options});

    };

    return fs;

}
