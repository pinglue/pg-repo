
import chalk from "chalk";

import type {
    Styler
} from "@pinglue/utils";

import {timeFormatter} from "../formatters.js";
import {dataFormatter} from "./formatters.js";

// TODO: style factory function/class

// default style
export const style: Styler = {

    error: chalk.redBright,
    errorRev: chalk.bgRed,
    info: chalk.blue,
    warn: chalk.yellow,
    hl: chalk.cyan,
    hlRev: chalk.bgCyan.black,
    mark: chalk.bgYellow.black,
    success: chalk.green,
    mute: chalk.grey,
    header: chalk.bold.magenta,
    bold: chalk.bold,
    badge: chalk.bgWhite.black,
    time: (t)=>timeFormatter(Number(t)),
    obj: (obj)=>dataFormatter(obj),
    errorObj: (obj)=>dataFormatter(obj)
};
