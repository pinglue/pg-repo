
import type {
    Styler
} from "@pinglue/utils";

import {styleTypes} from "@pinglue/utils";
import {timeFormatter} from "../formatters.js";

// TODO: style factory function/class

/* default style
======================== */

const baseCSS = "";

const styleMap = {
    error: "color: red",
    security: "color: red",
    errorRev: "background-color:red; color: white",
    warn: "color: coral",
    info: "color: dodgerblue",
    mark: "background-color: gold; color: black",
    success: "color: limegreen",
    mute: "color: grey",
    hl: "color: purple",
    hlRev: "background-color: purple",
    bold: "font-weight: bold",
    badge: "background-color: black; color: white",
    header: "color: darkblue"
};

// generic styler for the browser
export const style: Styler = styleTypes.reduce(
    (acc, styleName) => {

        switch(styleName) {

            case "time":
                acc[styleName] = t=>({
                    content: timeFormatter(Number(t))
                });
                break;

            case "obj":
                acc[styleName] = (obj=>(obj));
                break;

            case "errorObj":
                acc[styleName] = (obj=>(obj));
                break;

            default:
                acc[styleName] = (input => ({
                    content:`%c${input}`,
                    style:baseCSS + styleMap[styleName]
                }));

        }

        return acc;

    }, {}
);
