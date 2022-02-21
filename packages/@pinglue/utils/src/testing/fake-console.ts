
import type {Message} from "../message";

import type {
    Printer, Styler, PrintType
} from "../print";

import {
    printTypes, styleTypes
} from "../print.js";

type PrintMessage = {
    type?: PrintType;
    code?: string;
    data?: any;
};

class FakeConsole {

    #msgArray: PrintMessage[] = [];

    write(msg: PrintMessage)
    write(code: string, data?: any)
    write(msg: string | PrintMessage, data?: any) {

        if(typeof msg === "string") {

            this.#msgArray.push({
                code: msg,
                ...data ? {data} : {}
            });

        }
        else {

            this.#msgArray.push(msg);

        }

    }

    reset() {

        this.#msgArray = [];

    }

    /**
     * number of messages written to this console
     * @returns
     */
    get count(): number {

        return this.#msgArray.length;

    }

    /**
     *
     * @param index
     * @returns
     * @throws
     */
    at(index: number): PrintMessage {

        return this.#msgArray[index];

    }

    last(): PrintMessage | null
    last(count: number): PrintMessage[] | null
    last(count?: number): PrintMessage | PrintMessage[] | null {

        if (this.count === 0) return null;

        if (typeof count !== "number")
            return this.#msgArray[this.count - 1];

        if (count <= 0) return null;

        if (count >= this.count)
            return [...this.#msgArray];

        return this.#msgArray.slice(this.count - count);

    }

    contains(pattern: string | RegExp): PrintMessage | undefined {

        return this.#msgArray.find(
            msg => msg?.code.match(pattern)
        );

    }

}

// fake printer

export function createFakeConsole(): {
    fakeConsole: FakeConsole;
    fakePrint: Printer;
    fakeStyle: Styler;
} {

    const fakeConsole = new FakeConsole();

    const fakePrint: Printer = Object.assign(
        (msg: string | Message, data?: any) => {

            if (typeof msg === "string")
                fakeConsole.write(msg, data);
            else
                fakeConsole.write(msg);

        }
    );

    for (const type of printTypes) {

        fakePrint[type] = (code: string, data?: any)=>{

            fakeConsole.write({
                type, code, ...data ? {data} : {}
            });

        };

    }

    const fakeStyle = styleTypes.reduce(
        (acc, type)=> {

            acc[type] = (
                input: string | number | Object
            ) => input;

            return acc;

        }, {}
    );

    return {fakeConsole, fakePrint, fakeStyle};

}
