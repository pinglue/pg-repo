
import type {
    Message,
    MessageType,
    MessageSource,
    Messenger,
    Printer
} from "@pinglue/utils";

import {messageTypes} from "@pinglue/utils";

//import {milliTimeFormatter} from "../formatters.js";

import {style} from "./style.js";

import type {
    GenericPrinter,
    PrintMessengerHelper
} from "../printer-factory";

import {printMsgFactory} from "../printer-factory.js";

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

    //const arr = styledMessages.flatMap(x=>[x,"\b"]);

    //log(arr);
    //return;

    if (typeof data !== "undefined")
        log(styledMessages.join(""), data);
    else
        log(styledMessages.join(""));

};

const printMessenger: PrintMessengerHelper = printMsgFactory(
    printer, style
);

/**
 * Report printer
 * @param msg
 * @param src
 */
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

    let prefixes = [style.warn("~"), " Log "];
    printMessenger(msg, src, prefixes);

};

/**
 * For direct printing on the screen - support for msg levels - no new line added automatically
 * @param text
 * @param data
 */
export const print: Printer = Object.assign(

    (text: string|Message, data?: any) => {

        if (typeof text === "string") {
            process.stdin.write(text);
            data && console.log(" ", style.obj(data));
        }
        else {
            print[text.type || "info"](text.code, text.data)
        }

    },   

    {
        mute: (text: string, data?: any)=>print(style.mute(text), data),
        header: (text: string, data?: any)=>print(style.header(text), data)
    }

);

for (const type of messageTypes) {

    print[type] = (text: string, data?: any)=>{

        process.stdin.write(_getMsgLevel(type ) + " ");
        print(text, data);

    };

}

/**
 * helper
 * @param type
 * @returns
 */
function _getMsgLevel(type: MessageType) {

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