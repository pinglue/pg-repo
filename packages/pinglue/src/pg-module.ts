
import type {
    Message,
    MessageSource,
    MessageType,
    Messenger,
    PgModuleMessenger
} from "@pinglue/utils";

import {
    _default,
    _freeze,
    Msg,
    messageTypes
} from "@pinglue/utils";

import type {
    ChannelSettings,
    ChannelHandler,
    ChannelRunOptions
} from "./channel";

// =====================================

type PgModulePkgInfo = {
    name: string;
    version?: string;

    // TODO: other package.json settings that might be useful
};

// settings for hub/controller
export interface PgModuleSettings {

    __localLoggers?: Messenger | Messenger[];

    // if the controller has access to the file system this field contains the path to the project data folder. The path is either absolute or relative to the project root. Falsy means no file access and/or no file settings available. This value is calculated by the registry at the build time. It is usually computed as "root-data-path/pkg-name", where root-data-path is defined in the field dataPath of the project pg.yaml, or will default to data if not available. Options on registry can make this field undefined. Also making a pg.yaml in project root and set dataPath to null will effectively set this field to udnefined by regular registry settings
    __dataPath?: string;

    __pkgInfo?: PgModulePkgInfo;

    __channels?: Record<string, ChannelSettings>;

    // mainly handed down from the hub to controllers - not to be set by individual controllers really (unless for debugging or other exceptional situations)
    logger?: {
        domain?: string;
        runLogChannel?: boolean;
    };

    reporter?: {
        domain?: string;
    };

    disabled?: boolean;

    [extraField: string]: any;

}

/**
 * Contains the common login between controller and hub, and basically represents a general pinglue component with features:
 * - having id and settings as its main identity
 * - phase
 * - channel operations (implementing ChannelObjectInterface)
 * - logging system (a PgLogger instance property)
 */
export abstract class PgModule {

    protected id: string;
    protected settings: PgModuleSettings;
    protected __messageSource: MessageSource;
    protected phase = 0;

    // the error info which prevented this module from initializing properly - a module with this field set is generally not usuable and must be debuged
    protected error: Message;

    log: PgModuleMessenger;
    report: PgModuleMessenger;
    mark: (code: string, data?: any) => void;

    // root data dir of this controller. Falsy value means no data folder available - defaults to "data/controller-id"
    protected dataPath: string;

    // info for this controller's package - subset of package.json - notable fields: name, version
    protected pkgInfo?: PgModulePkgInfo;

    /* Life cycle methods
    ==================================== */

    constructor(
        id?: string,
        settings: PgModuleSettings = {},
        defaultSettings?: PgModuleSettings
    ) {

        // processing id
        this.id = id || "NA";
        /*Object.defineProperty(this, "id", {
            writable: false
        });*/

        /* processing settings
        --------------------------- */

        // fallback
        if (typeof settings !== "object" ||
            settings === null
        ) settings = {};

        // defaulting
        this.settings = _default(settings, defaultSettings);

        // additional custom processing
        this.processSettings(settings);

        // Deep freezing - NO NEED! SETTINGS COME FROM GENERATED OBJECT LITERAL CODE - NO RISK OF GLOBAL SIDE EFFECT
        //this.settings = _freeze(settings);

        /* Assigning handy data
        ----------------------------- */

        // data dir
        this.dataPath = this.settings.__dataPath;

        // package info
        this.pkgInfo = this.settings.__pkgInfo;

        /* initing log
        -------------------- */

        // log message source
        this.__messageSource = {
            runner: this.id
        };

        // log method
        this.log = Object.assign(
            (msg: string | Message, data?: any) =>
                this.#log(msg, data),
            messageTypes.reduce(
                (acc, type: MessageType) => {

                    acc[type] = (code: string, data: any) =>
                        this.#log({type, code, data});
                    return acc;

                },
                {}
            )
        );

        this.mark = this.log.mark;

        /* initing report
        ------------------------ */

        this.report = Object.assign(
            (msg: string | Message, data?: any) =>
                this.#report(msg, data),
            messageTypes.reduce(
                (acc, type: MessageType) => {

                    acc[type] = (code: string, data: any) =>
                        this.#report({
                            type,
                            code,
                            data
                        });
                    return acc;

                },
                {}
            )
        );

    }

    protected abstract __canRunChannel(): boolean;

    cleanup() {}

    protected processSettings(
        settings: PgModuleSettings
    ): void {}

    /* Channel system
    ============================= */

    abstract regChannel(
        channelName: string,
        settings: ChannelSettings
    );

    abstract chanSettings(
        channelName: string,
        settings: ChannelSettings
    );

    abstract glue(
        channelName: string,
        handler: ChannelHandler
    ): boolean;

    abstract unglue(
        channelName: string,
        handler: ChannelHandler
    ): boolean;

    abstract runS(
        channelName: string,
        params?: Object,
        value?: any,
        options?: ChannelRunOptions
    ): any;

    abstract runA(
        channelName: string,
        params?: Object,
        value?: any,
        options?: ChannelRunOptions
    ): Promise<any>;

    /* Log/report system
    ============================== */

	#log(msg: string | Message, data?: any): void {

        const _msg: Message =
			typeof msg === "object" ? msg : {
			    type: "info",
			    code: msg,
			    data
			};

        _default(_msg, {
            timestamp: Date.now(),
            domain: this.settings.logger?.domain
        });

        // local logging
        if (this.settings.__localLoggers) {

            if (
                Array.isArray(this.settings.__localLoggers)
            ) {

                for (const m of this.settings
                    .__localLoggers) {

                    m(_msg, this.__messageSource);

                }

            }
            else {

                this.settings.__localLoggers(
                    _msg,
                    this.__messageSource
                );

            }

        }

        // running log channel
        if (
            this.settings.logger?.runLogChannel &&
			this.__canRunChannel()
        ) {

            // no need to await
            this.runA("log", {
                msg: _msg,
                src: this.__messageSource
            }
            ).catch((error) => {});

        }

    }

	#report(msg: string | Message, data?: any): void {

	    const _msg: Message =
			typeof msg === "object"
			    ? msg
			    : {
			        type: "info",
			        code: msg,
			        data
				  };

	    _default(_msg, {
	        timestamp: Date.now(),
	        domain: this.settings.reporter?.domain
	    });

	    if (this.__canRunChannel()) {

	        // no need to await
	        this.runA("report", {
	            msg: _msg,
	            src: this.__messageSource
	        }).catch((error) => {});

	    }

	}

	/* Aux/helper methods
    ===================== */

	/**
     * TODO: TO DEPRECATE - and replaced by channel reducer validation
	 * Aux method mainly to be used inside a handler method to check if params arg has all the necessary fields. If not it logs an error and then throws an error
	 * @param params
	 * @param fields
	 * @throws
	 */
	 protected __checkParams(
	    params: Object,
	    ...fields: string[]
	): void {

	    const list = fields.filter((field) => {

	        return typeof params[field] === "undefined";

	    });

	    if (list.length) {

	        this.log.error(
	            "checkParams missing parameters:",
	            list
	        );
	        throw Msg.error("err-missing-params");

	    }

	}

}
