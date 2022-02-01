
import PrettyError from "pretty-error";
import jsonBeautify from "json-beautify";
import fs from "fs-extra";

import type {
    Message,
    MessageSource
} from "@pinglue/utils";

// =================================

const pe = new PrettyError().withoutColors();

export async function writeLog(
    filePath: string,
    msg: Message,
    src: MessageSource = {}
): Promise<void> {

    await writeMsg("LOG", filePath, msg, src);

}

export async function writeReport(
    filePath: string,
    msg: Message,
    src: MessageSource = {}
): Promise<void> {

    await writeMsg("REPORT", filePath, msg, src);

}

/**
 *
 * @param filePath
 * @param tagName
 * @param msg
 * @param src
 * @throws if fails to format or write to the destination file
 */
export async function writeMsg(
    tagName: string,
    filePath: string,
    msg: Message,
    src: MessageSource = {}
): Promise<void> {

    let errorText = "";

    if (msg.type === "error") {

        let errorObj: Error;

        if (msg.data instanceof Error)
            errorObj = msg.data;
        else if (msg.data?.error instanceof Error)
            errorObj = msg.data.error;

        if (errorObj) {

            errorText = `<ERROR>\n${pe.render(errorObj)}\n</ERROR>\n`;

        }

    }

    await fs.writeFile(
        filePath,
        `<${tagName} from = "${_getFromStr(src)}" code = "${msg.code || "NA"}" >\n${jsonBeautify(msg, null, 4, 40)}\n${errorText}</${tagName}>\n\n`,
        {flag: "a"}
    );

}

function _getFromStr(src: MessageSource) {

    let arr = [];
    src.runner && arr.push(src.runner);
    src.runnerSct && arr.push(src.runnerSct);

    return arr.join("/");

}