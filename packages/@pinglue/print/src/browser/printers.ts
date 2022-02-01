
import type {
    Message,
    MessageSource,
    Messenger
} from "@pinglue/utils";

import {style} from "./style.js";

import type {
    GenericPrinter,
    PrintMessengerHelper
} from "../printer-factory";

import {printMsgFactory} from "../printer-factory.js";

// =============================================

// generic printer for the browser
const printer: GenericPrinter = (
    styledMessages, data?, options?
) => {

    let log;
    if (
        options.msgType === "error" ||
        options.msgType === "security"
    )
        log = console.error;

    else if (options.msgType === "warn")
        log = console.warn;

    else
        log = console.log;

    const arr = [""];
    styledMessages.forEach(term => {

        const content = (typeof term === "string") ?
            `%c${term}` : term.content;

        arr[0] += content;
        arr.push(term.style || "");

    });

    if (typeof data !== "undefined")
        log(...arr, data);
    else
        log(...arr);

};

const printMessenger: PrintMessengerHelper = printMsgFactory(
    printer, style
);

export const printReport: Messenger = function(
    msg: Message,
    src: MessageSource
) {

    let prefixes = [style.warn("@ Rep"), " "];
    printMessenger(msg, src, prefixes);

};

/**
 * Log printer
 * @param msg
 * @param src
 */
export const printLog: Messenger = function(
    msg: Message,
    src: MessageSource
) {

    let prefixes = [style.info("~ Log"), " "];
    printMessenger(msg, src, prefixes);

};
