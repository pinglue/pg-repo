
/* Message types
======================= */

export type MessageType = "info" | "success" | "warn" | "error" | "security" | "mark";

// General Message
export interface Message {

    type?: MessageType;

    timestamp?: number;

    // used for dic lookup
    code?: string;
    domain?: string;
    params?: Record<string | number, string | number>;

    // optional, for error messages this field can return the code (or a processed version of it), to make an error message compatible with js Error class and corresponding tools
    message?: string;

    // additional details
    data?: any;
}

/* Messenger types
==================== */

export type MessageSource = {
    runner?: string;
    runnerSct?: string;
};

export type Messenger = (
    msg: Message,
    src: MessageSource
) => void;

export type PgModuleMessenger = {

    (msg: Message): void;
    (code: string, data?: any): void;
} & {
    [type in MessageType]?: (code: string, data?: any) => void
};

/* Message utils
========================== */

type MessageConstructor = {
    (code?: string, data?: any): Message;
} & {
    [type in MessageType]?: (code?: string, data?: any) => Message
};

export const messageTypes: readonly MessageType[] = Object.freeze([
    "info",
    "success",
    "warn",
    "error",
    "security",
    "mark"
]);

export const Msg: MessageConstructor = Object.assign(
    (code = "", data?: any) => ({
        type: "info", code, data
    } as Message),
    messageTypes.reduce(
        (acc, type) => {

            acc[type] = (code = "", data?: any) =>
                ({
                    type, code, data,
                    get message() {

                        if (this.type === "error")
                            return this.code;
                        else
                            return "";

                    }
                });
            return acc;

        }, {}
    )
);

export const emptyMessenger: Messenger
= function(
    msg: Message,
    src: MessageSource
) {};

export const consoleMessenger: Messenger
= function(
    msg: Message,
    src: MessageSource
) {

    let consoleFunc;

    if (["error", "security"].includes(msg.type))
        consoleFunc = console.error;
    else if (msg.type === "warn")
        consoleFunc = console.warn;
    else
        consoleFunc = console.log;

    const arr = [
        "~ pg ~",
        "[" + (src.runner || "no-src") + "]",
        msg.code
    ];

    if (msg.data) arr.push(msg.data);

    consoleFunc(...arr);

};

export const emptyPgModuleMessenger: PgModuleMessenger
= Object.assign(
    (msg: Message) => {},
    (code: string, data?: any) => {},
    messageTypes.reduce((acc, type)=>{

        acc[type] = (
            code: string, data?: any
        ) => {};

        return acc;

    }, {})
);
