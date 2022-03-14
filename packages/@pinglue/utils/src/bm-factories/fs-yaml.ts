
import * as nodeFsPromises from "fs/promises";
import yaml from "yaml";
import { FsModule } from ".";
import {Msg} from "../message.js";

/**
 * @param filePath
 * @returns json of the yaml file
 * @throws if file not found or yaml format is wrong (data format: {filePath, error}) - error code:
 * - err-yaml-file-not-found
 * - err-cannot-read-file
 * - err-yaml-parse-error
 */
export async function _readYaml<T extends Object>(
    filePath: string,
    fsModule: FsModule = nodeFsPromises
): Promise<T> {

    if (!await fsModule.pathExists(filePath))
    throw Msg.error("err-yaml-file-not-found", {filePath});

    let str: string;

    try {

        str = (await fsModule.readFile(filePath, {encoding: "utf8"})).toString();

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
        }) as T;

    }
    catch(error) {

        throw Msg.error("err-yaml-parse-error", {
            filePath,
            error
        });

    }


}
