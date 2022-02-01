
import type {
    Object
} from "@pinglue/utils";

import {Msg, _default} from "@pinglue/utils";

import type {
    PgModuleSettings
} from "../pg-module";

import {PgModule} from "../pg-module.js";

import type {
    ControllerSettings
} from "../controller";

import {Controller} from "../controller.js";

import {ControllerManager} from "./controller-manager.js";

import {ChannelManager} from "./channel-manager.js";

import type {
    ChannelSettings,
    ChannelHandler,
    ChannelRunOptions,
    ChannelsReport
} from "../channel";

// ==============================

interface HubSettings extends PgModuleSettings {};

export type CtAuth = {
    id: string;
    hash: number;
};

export type HubRegisterInfo = {
    id: string;
    hash: number;
    channelObject: HubChannelObject;
    deregisterHandler?: HubDeregisterHandler;
};

export type HubRegisterObject = {
    registerNew: (id?: string, settings?: ControllerSettings, ClassRef?: typeof Controller) => Controller;
    glueNew: (id?: string, settings?: ControllerSettings, ClassRef?: typeof Controller) => Promise<Controller>;
};

export type HubDeregisterHandler = (ctAuth: CtAuth) => void;

export type HubChannelObject = {

    regChannel: (
        channelName: string,
        ctAuth: CtAuth,
        settings: ChannelSettings
    ) => void;

    chanSettings: (
        channelName: string,
        ctAuth: CtAuth,
        settings: ChannelSettings
    ) => void;

    glue: (channelName: string, ctAuth: CtAuth, handler: ChannelHandler) => boolean;

    unglue: (channelName: string, ctAuth: CtAuth, handler: ChannelHandler) => boolean;

    runS: (
        channelName: string,
        ctAuth: CtAuth,
        params?: Object,
        value?: any,
        options?: ChannelRunOptions
    ) => any;

    runA: (
        channelName: string,
        ctAuth: CtAuth,
        params?: Object,
        value?: any,
        options?: ChannelRunOptions
    ) => Promise<any>;
};

enum PHASE {
    registering = 1, // initial state, the hub is registering controllers using registerNew handler
    initing, // When the hub init method is called, so all the controllers are being initiating or done initiating (cannot register any controller in this state)
    inited, // done initing all the controllers, now the hub can be started
    started // When the hub start method is called, now the controllers are interacting. Controllers can also be added (dynamically) at this stage using glueNew/registerNew handlers.
}

export class Hub extends PgModule {

    protected settings: HubSettings;
    protected phase: PHASE = PHASE.registering;

    #ctMgr: ControllerManager;
    #chanMgr: ChannelManager;

    // binding register handlers
    registerNewHandler__bound =
    this.registerNewHandler.bind(this);

    glueNewHandler__bound =
    this.glueNewHandler.bind(this);

    deregisterHandler__bound =
    this.deregisterHandler.bind(this);

    // binding channel handlers

    regChannelHandler__bound =
    this.regChannelHandler.bind(this);

    chanSettingsHandler__bound =
    this.chanSettingsHandler.bind(this);

    glueHandler__bound =
    this.glueHandler.bind(this);

    unglueHandler__bound =
    this.unglueHandler.bind(this);

    runSHandler__bound =
    this.runSHandler.bind(this);

    runAHandler__bound =
    this.runAHandler.bind(this);

    /* pg module life cycle
    ========================== */

    constructor(
        id?: string,
        settings?: HubSettings
    ) {

        super(id || "hub", settings);

        // controller manager
        this.#ctMgr = new ControllerManager({
            __log: this.log
        });

        // channel manager
        this.#chanMgr = new ChannelManager({
            __log: this.log
        });

        // introductionary log
        this.log("msg-hub-constructed");

    }

    __canRunChannel() {

        return (
            this.phase === PHASE.inited ||
			this.phase === PHASE.started
        );

    }

    /**
	 * Changes the phase from register to init and invokes the init callback method of all controllers added during the register phase asyncronously (using Promise.all). If current phase is not register it will not run. Safe in regard to duplicate calling, etc.
	 */
    public async init(): Promise<void> {

        if (this.phase !== PHASE.registering) {

            throw Msg.error("err-hub-already-initialized");

        }

        this.phase = PHASE.initing;

        // hub services - TODO: do this based on some settings
        //if (this.settings.__env?.mode !== "production") {

        this.regChannel("--report-channels", {
            singleHandler: true,
            syncType: "sync"
        });

        this.glue(
            "--report-channels",
            this.channelReport.bind(this)
        );
        //}

        await this.#ctMgr.initAll();

        this.phase = PHASE.inited;

    }

    /**
	 * Changes the phase from init to start and invokes the start callback method of all controllers added during the register phase asyncronously (using Promise.all). If current phase is not init it will not run. Safe in regard to duplicate calling, etc.
	 */
    public async start(): Promise<void> {

        if ([PHASE.registering, PHASE.initing]
            .includes(this.phase)) {

            throw Msg.error("err-hub-wrong-phase-to-start");

        }

        if (this.phase === PHASE.started) {

            throw Msg.error("err-hub-already-started");

        }

        this.phase = PHASE.started;
        await this.#ctMgr.startAll();

    }

    /* Controller registration/deregistration
    ========================================= */

    /**
	 *
	 * @param id
	 * @param settings
	 * @param ClassRef
	 * @returns
	 * @throws
	 */
    #registerNew(
        id?: string,
        settings: ControllerSettings = {},
        ClassRef: typeof Controller = Controller
    ): Controller {

        // adding log info to controller
        settings.__localLoggers =
			this.settings.__localLoggers;
        settings.logger = settings.logger || {};
        _default(settings.logger, this.settings.logger);

        // adding data dir info
        //settings.__rootDataPath = this.settings.__rootDataPath;

        const controller = new ClassRef(id, settings);
        const {ctAuth} = this.#ctMgr.register(
            id,
            controller,
            {flexId:settings.__flexId}
        );

        // register callback
        try {

            controller.registerCallback({
                id: ctAuth.id,
                hash: ctAuth.hash,
                channelObject: this.channelObject,
                deregisterHandler: this.deregisterHandler__bound
            });

        }
        catch (error) {

            throw Msg.error(
                "err-register-callback-exception",
                {error}
            );

        }

        return controller;

    }

    /**
	 * creates and adds a controller to this hub. Only works if the hub is in register state (=initial state). For adding controllers to the hub after this state use glueNewhandler
	 * @param id
	 * @param settings
	 * @param ClassRef
	 * @throws if any exception is thrown in registerCallback of the controller or this method is called when the hub phase is other than register
	 */
    registerNewHandler(
        id?: string,
        settings: ControllerSettings = {},
        ClassRef: typeof Controller = Controller
    ): Controller {

        // registration can only be done in the very beginning or after the hub has been started
        if (![PHASE.registering,
            PHASE.started].includes(this.phase)) {

            throw Msg.error("err-wrong-phase-to-register-ct", {
                phase: this.phase,
                id
            });

        }

        const controller = this.#registerNew(
            id,
            settings,
            ClassRef
        );

        return controller;

    }

    /**
	 * creates and adds a controller to this hub. It runs the registerCallback method of the controller, followed by initcallback and startcallback
	 * @param id
	 * @param settings
	 * @param ClassRef
	 * @throws [[Result]] if any error happen (like duplicate controller id or exception in init method/start method)
	 */
    async glueNewHandler(
        id?: string,
        settings: Object = {},
        ClassRef: typeof Controller = Controller
    ): Promise<Controller> {

        if (this.phase !== PHASE.started) {

            throw Msg.error("err-wrong-phase-to-glue-ct", {
                phase: this.phase,
                id
            });

        }

        const controller = this.#registerNew(
            id,
            settings,
            ClassRef
        );

        // running lifecycle methods of the controller
        await controller.initCallback();
        await controller.startCallback();

        return controller;

    }

    /**
	 * Public register handler object. Exporting tools/methods needed for registration. ATM contains glueNew method. In the future it can have more
	 */
    get registerObject(): HubRegisterObject {

        return {
            registerNew: this.registerNewHandler__bound,
            glueNew: this.glueNewHandler__bound
        };

    }

    deregisterHandler(ctAuth: CtAuth) {

        this.#ctMgr.auth(ctAuth);

        // removing all the channel handlers
        this.#chanMgr.removeController(ctAuth.id);

        // removing from ct registry
        this.#ctMgr.removeController(ctAuth.id);

    }

    /* Channel object
    ======================== */

    regChannelHandler(
        channelName: string,
        ctAuth: CtAuth,
        settings: ChannelSettings
    ): void {

        this.#ctMgr.auth(ctAuth);

        this.#chanMgr.regChannel(
            channelName,
            ctAuth.id,
            settings
        );

    }

    chanSettingsHandler(
        channelName: string,
        ctAuth: CtAuth,
        settings: ChannelSettings
    ): void {

        this.#ctMgr.auth(ctAuth);

        this.#chanMgr.chanSettings(
            channelName,
            ctAuth.id,
            settings
        );

    }

    glueHandler(
        channelName: string,
        ctAuth: CtAuth,
        handler: ChannelHandler
    ): boolean {

        this.#ctMgr.auth(ctAuth);
        return this.#chanMgr.glue(
            channelName,
            ctAuth.id,
            handler
        );

    }

    unglueHandler(
        channelName: string,
        ctAuth: CtAuth,
        handler: ChannelHandler
    ): boolean {

        this.#ctMgr.auth(ctAuth);
        return this.#chanMgr.unglue(
            channelName,
            ctAuth.id,
            handler
        );

    }

    /**
	 *
	 * @param channelName
	 * @param ctAuth
	 * @param params
	 * @param value
	 * @returns
	 * @throws
	 */
    runSHandler(
        channelName: string,
        ctAuth: CtAuth,
        params?: Object,
        value?: any,
        options?: ChannelRunOptions
    ): any {

        // throw error if the hub is not in start phase - Lock system
        if (!this.__canRunChannel()) {

            throw Msg.error(
                "err-wrong-phase-channel-run",
                {phase:this.phase}
            );

        }

        this.#ctMgr.auth(ctAuth);
        return this.#chanMgr.runS(
            channelName,
            ctAuth.id,
            params,
            value,
            options
        );

    }

    /**
	 *
	 * @param channelName
	 * @param ctAuth
	 * @param params
	 * @param value
	 * @param options
	 * @returns
	 * @throws
	 */
    async runAHandler(
        channelName: string,
        ctAuth: CtAuth,
        params?: Object,
        value?: any,
        options?: ChannelRunOptions
    ): Promise<any> {

        // throw error if the hub is not in start phase - Lock system
        if (!this.__canRunChannel()) {

            throw Msg.error(
                "err-wrong-phase-channel-run",
                {phase:this.phase}
            );

        }

        this.#ctMgr.auth(ctAuth);
        return this.#chanMgr.runA(
            channelName,
            ctAuth.id,
            params,
            value,
            options
        );

    }

    /**
	 * Public channel handler
	 */
    public get channelObject(): HubChannelObject {

        return {
            regChannel: this.regChannelHandler__bound,
            chanSettings: this.chanSettingsHandler__bound,
            glue: this.glueHandler__bound,
            unglue: this.unglueHandler__bound,
            runS: this.runSHandler__bound,
            runA: this.runAHandler__bound
        };

    }

    /* direct channel access through the hub instance
    ================================================== */

    regChannel(
        channelName: string,
        settings: ChannelSettings
    ) {

        this.#chanMgr.regChannel(
            channelName,
            this.id,
            settings
        );

    }

    chanSettings(
        channelName: string,
        settings: ChannelSettings
    ) {

        this.#chanMgr.chanSettings(
            channelName,
            this.id,
            settings
        );

    }

    public glue(
        channelName: string,
        handler: ChannelHandler
    ): boolean {

        return this.#chanMgr.glue(
            channelName,
            this.id,
            handler
        );

    }

    public unglue(
        channelName: string,
        handler: ChannelHandler
    ): boolean {

        return this.#chanMgr.unglue(
            channelName,
            this.id,
            handler
        );

    }

    public runS(
        channelName: string,
        params?: Object,
        value?: any,
        options?: ChannelRunOptions
    ): any {

        // throw error if the hub is not in start phase - Lock system
        if (!this.__canRunChannel()) {

            throw Msg.error(
                "err-wrong-phase-direct-channel-run",
                {phase:this.phase}
            );

        }

        return this.#chanMgr.runS(
            channelName,
            this.id,
            params,
            value,
            options
        );

    }

    public async runA(
        channelName: string,
        params?: Object,
        value?: any,
        options?: ChannelRunOptions
    ): Promise<any> {

        // throw error if the hub is not in start phase - Lock system
        if (!this.__canRunChannel()) {

            throw Msg.error(
                "err-wrong-phase-direct-channel-run",
                {phase:this.phase}
            );

        }

        return this.#chanMgr.runA(
            channelName,
            this.id,
            params,
            value,
            options
        );

    }

    /* Log/Report
    ===================================== */

    channelReport(): ChannelsReport {

        return this.#chanMgr?.report();

    }

}
