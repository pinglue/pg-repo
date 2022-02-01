
import type {
    Message,
    MessageType,
    MessageSource,
    Styler
} from "@pinglue/utils";

import {milliTimeFormatter} from "./formatters.js";

// ==================================================

export type GenericPrinter = (
    styledMessages?: any[], // arr of styled messages
    data?: any, // data to be displayed
    options?: {msgType?: string}
) => void;

export type PrintMessengerHelper = (
    msg: Message,
    src: MessageSource,
    prefixes?: any[]
) => void;

export function printMsgFactory(
    printer: GenericPrinter,
    style: Styler
): PrintMessengerHelper {

    return (
        msg: Message,
        src: MessageSource,
        prefixes: any[]
    ): void => {

        const items: string[] = [
            ...prefixes,
            style.mute(
                milliTimeFormatter(msg.timestamp | Date.now())
            )
        ];

        if (src.runner) {

            items.push(style.mute(" ["), style.hl(src.runner));
            if (src.runnerSct)
                items.push("/", style.hl(src.runnerSct));
            items.push(style.mute("] "));

        }

        // level indicator
        if (msg.type && msg.type !== "info") {

            items.push(_getMsgLevel(style, msg.type));
            items.push(" ");

        }

        // text
        items.push(msg.code || style.mute("[No message]"));
        items.push(" ");

        let data;

        if (typeof msg.data !== "undefined") {

            data = (
                msg.type === "error" ||
                msg.type === "security"
            ) ? style.errorObj(msg.data) : style.obj(msg.data);

        }

        printer(items, data, {msgType:msg.type});

    };

}

function _getMsgLevel(style: Styler, type: MessageType) {

    switch (type) {

        case "info":
            return style.info("Info!");

        case "success":
            return style.success("Success!");

        case "warn":
            return style.warn("Warning!");

        case "error":
            return style.errorRev("Error!");

        case "security":
            return style.error("Security!");

        case "mark":
            return style.mark("MARK MARK!");

        default:
            return "";

    }

}
