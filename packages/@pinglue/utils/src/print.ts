
import type {Object} from "./types";

import type {
    MessageType,
    Message
} from "./message";

import {messageTypes} from "./message.js";

/* Printer
==================================== */

export type PrintType = MessageType | "mute" | "header";

export type Printer = {
    (msg: Message): void;
    (code: string, data?: any): void;

} & {
    [type in PrintType]?: (code: string, data?: any) => void
};

/* Styler
============================= */
export type StyleType = PrintType | "errorRev" | "hl" | "hlRev" | "bold" | "badge" | "obj" | "errorObj" | "time";

export type Styler = {
    [type in StyleType]?: (input: string | number | Object) => any
};

/* Print utils
=========================== */

export const printTypes: readonly PrintType[] = Object.freeze([
    ...messageTypes,
    "mute",
    "header"
]);

export const styleTypes: readonly StyleType[] = Object.freeze([
    ...printTypes,
    "errorRev",
    "hl",
    "hlRev",
    "mark",
    "bold",
    "badge",
    "obj",
    "errorObj",
    "time"
]);

export const emptyPrint: Printer = Object.assign(
    (msg: Message) => {},
    (code: string, data?: any) => {},
    printTypes.reduce((acc, type)=>{

        acc[type] = (
            code: string, data?: any
        ) => {};

        return acc;

    }, {})
);

export const emptyStyle: Styler = styleTypes.reduce(
    (acc, type)=> {

        acc[type] = (
            input: string | number | Object
        ) => {};

        return acc;

    }, {}
);
