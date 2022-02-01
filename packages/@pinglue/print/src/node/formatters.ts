
import PrettyError from "pretty-error";
import util from "util";

import {_pad} from "../formatters.js";
//import {style} from "./style.js";

const pe = new PrettyError();

export function dataFormatter(data: any): string {

    if (typeof data === "undefined") {

        return "";

    }

    if (data instanceof Error) {

        const items = [];

        items.push("\n\n", pe.render(data));

        return items.join("");

    }

    let d;
    if (data === null) d = "data: NULL";
    else if (data === false) d = "data: FALSE";
    else if (data === true) d = "data: TRUE";
    else if (data === "") d = "data: [EMPTY STRING]";
    else if (typeof data === "function") d = `data: [FUNCTION: ${data.name}] `;
    else d = data;

    return (typeof d === "string") ?
        d :
        util.inspect(d, false, null, true);

}
