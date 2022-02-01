
import {Msg, _merge} from "@pinglue/utils";

import type {
    PgModuleSettings
} from "./pg-module";

import {PgModule} from "./pg-module.js";

import type {
    CtAuth,
    HubDeregisterHandler,
    HubChannelObject,
    HubRegisterInfo
} from "./hub";

import type {
    ChannelSettings,
    ChannelHandler,
    ChannelRunOptions
} from "./channel";

// =========================

type ExtensionsInfo = {
    id: string;
    ClassRef?: typeof Controller;
    settings?: ControllerSettings;
}[];

export interface ControllerSettings extends PgModuleSettings {

    //__superCt?: Controller;
    __sctId?: string;
    __extensions?: ExtensionsInfo;

    // if setthis controller allows its id to be changed when registering to the hub in case of id collision. If false, id collision will fail to register this controlller (default: false)
    __flexId?: boolean;

    [name: string]: any;
}

enum PHASE {
    genesis = 0, // just built
    registered, // registered with some controller, not inited yet
    initing, // being inited.
    inited, // the init callback has been done, the start has not yet been called
    started, // start callback is being called or done calling
    error // some error happened during the life cycle (details in this.error object)
}

type InitMethod = () => void | Promise<void>;

/**
 * Base class for pinglue controllers
 */
export class Controller extends PgModule {

    /**
	 * Controller settings, which is the result of merging: default settings for this controller from the pg.yaml of the package <- user global settings (in data folder) <- context specific additional settings (like page settings for html frontend)
	 */
    protected settings: ControllerSettings;

    // register/channel system
    #ctAuth: CtAuth;
    #deregisterHandler: HubDeregisterHandler;
    #channelObject: HubChannelObject;
    #initMethodsList: InitMethod[] =
    [()=>this.initChannels(), async()=>this.init()];

    /* Life cycle methods
    ==================================== */

    /**
	 * @param id - Controller id, defined by the developer and hardcoded into the pg.yml of this module. The standard is the official npm package name (kebab case) but can be anything. This id is used to refer to this module, particularly for the controllers this id is used to route the frontend requests to its backend by the request-handler-ct
	 * @param settings
	 */
    constructor(
        id?: string,
        settings?: ControllerSettings,
        defaultSettings?: ControllerSettings
    ) {

        super(id, settings, defaultSettings);

        // updating msg source if it is a sub controller
        if (this.settings.__sctId)
            this.__messageSource.runnerSct =
				this.settings.__sctId;

        // parent ref if this is a subcontroller
        this.superCt = this.settings.__superCt;

        // introductionary log
        this.log("msg-ct-constructed");

    }

    protected __canRunChannel() {

        return (
            this.phase === PHASE.inited ||
			this.phase === PHASE.started
        );

    }

    protected addInitMethod(method: InitMethod) {

        this.#initMethodsList.push(method);

    }

    /**
	 * First part of controller life cycle after registration.
	 * This is place to:
	 *
	 * - glue to channels.
	 * - create sub controllers
	 *
	 * DO NOT run channels in this method. For some controllers may not have finished their init method yet. Do only "internal" initiation consisting of items mentioned above.
	 *
	 */
    protected async init(): Promise<void> {}

    /**
	 * callback for the init phase (direct call from the external loader)
	 */
    async initCallback(): Promise<void> {

        if (this.phase === PHASE.error) return;

        else if (this.phase === PHASE.genesis) {

            this.log.warn(
                "warn-initing-without-register"
            );

        }
        else if (this.phase !== PHASE.registered) {

            this.log.error("err-init-on-invalid-phase", {
                phase: this.phase
            });
            throw Msg.error("err-init-on-invalid-phase", {
                phase: this.phase
            });

        }

        this.log("msg-initiating");
        this.phase = PHASE.initing;

        // an array of init promises: this.init and all the inits of subcontrollers

        // running the init methods
        try {

            await Promise.all(this.#initMethodsList.map(
                method => method()
            ));

        }
        catch(error) {

            this.phase = PHASE.error;
            this.error = Msg.error("err-init-methods-exception", error);
            this.log(this.error);
            return;

        }

        // running inits of all subcontrollers
        if (Array.isArray(this.settings.__extensions)) {

            try {

                await Promise.all(this.settings.__extensions.map(
                    async({id, settings, ClassRef}) => this.newSubController(
                        id,
                        settings,
                        ClassRef
                    )
                ));

            }
            catch(error) {

                this.phase = PHASE.error;
                this.error = Msg.error("err-scts-inits-exception", error);
                this.log(this.error);
                return;

            }

        }

        // memory optimization
        delete this.settings.__extensions;

        this.phase = PHASE.inited;

    }

    initChannels(): void {

        if (!this.settings.__channels) return;

        for(let [name, settings] of
            Object.entries(this.settings.__channels)) {

            if (name.startsWith("--"))
                name = this.internalChan(name.slice(2));

            this.regChannel(name, settings);

        }

        // memory optimization
        delete this.settings.__channels;

    }

    /**
     *
     * @returns
     * @throws
     */
    initCallbackSync(): void {

        if (this.phase === PHASE.error) return;

        else if (this.phase === PHASE.genesis) {

            this.log.warn(
                "warn-initing-without-register"
            );

        }
        else if (this.phase !== PHASE.registered) {

            this.log.error(
                `Controller is being init in the wrong phase (Phase: ${this.phase})`
            );
            throw Msg.error("err-init-on-invalid-phase", {
                phase: this.phase
            });

        }

        this.log("msg-initiating");
        this.phase = PHASE.inited;

    }

    /**
	 * last part of controller life cycle after init. This is when all the controllers in the pg system have completed their init method and now it is safe to communicate with other controllers (through glue and run)
	 */
    protected async start(): Promise<void> {}

    /**
	 * callback for the start phase (direct call from the external loader)
	 */
    async startCallback(): Promise<void> {

        if (this.phase === PHASE.error) return;

        else if (this.phase !== PHASE.inited) {

            this.log.error("err-start-on-invalid-phase", {
                phase: this.phase
            });
            throw Msg.error("err-start-on-invalid-phase", {
                phase: this.phase
            });

        }

        this.log("msg-started");
        this.phase = PHASE.started;

        // an array of promises, including this.start and teh start of all the sub controllers
        const starts: Promise<any>[] = [this.start()];

        this.#sctList.forEach((ct) =>
            starts.push(ct.startCallback())
        );

        // starting all the sub controllers
        try {

            await Promise.all(starts);

        }
        catch(error) {

            this.log.error(
                "err-start-method-exception",
                {error}
            );

        }

    }

    /**
     *
     * @returns
     * @throws
     */
    startCallbackSync(): void {

        if (this.phase === PHASE.error) return;

        else if (this.phase !== PHASE.inited) {

            this.log.error("err-start-on-invalid-phase", {
                phase: this.phase
            });
            throw Msg.error("err-start-on-invalid-phase", {
                phase: this.phase
            });

        }

        this.log("msg-started");
        this.phase = PHASE.started;

    }

    /**
	 * Removes the controller from the hub (and all its handlers from the channels)
	 * subclasses can extends and add more cleanup operations if need be
	 */
    cleanup(): void {

        this.log("msg-cleaning-up");

        try {

            if (typeof this.#deregisterHandler === "function")
                this.#deregisterHandler(this.#ctAuth);

        }
        catch(error){

            this.log.error(
                "err-cleanup-exception", {error}
            );

        }

    }

    /* Register system
    ====================== */

    /**
	 * Not to be modified by subclasses
	 * @param info
	 */
    registerCallback(info: HubRegisterInfo): void {

        if (this.phase !== PHASE.genesis) {

            this.log.warn(
                "warn-ct-already-registered"
            );

        }

        // change id if need be
        if (this.settings.__flexId)
            this.id = info.id;

        // initing message source for loggin
        this.__messageSource.runner = this.id;

        this.#channelObject = info.channelObject;
        this.#ctAuth = {
            id: this.id,
            hash: info.hash
        };
        this.#deregisterHandler = info.deregisterHandler;

        this.log.success(
            "suc-registered",
            {hash: this.#ctAuth.hash}
        );
        this.phase = PHASE.registered;

    }

    /* Channel system
    ========================= */

    regChannel(
        channelName: string,
        settings?: ChannelSettings
    ) {

        this.#channelObject.regChannel(
            channelName,
            this.#ctAuth,
            settings
        );

    }

    chanSettings(
        channelName: string,
        settings?: ChannelSettings
    ) {

        this.#channelObject.chanSettings(
            channelName,
            this.#ctAuth,
            settings
        );

    }

    /**
	 *
	 * @param channelName
	 * @param handler
	 * @returns
	 */
    glue(
        channelName: string,
        handler: ChannelHandler
    ): boolean {

        return this.#channelObject.glue(
            channelName,
            this.#ctAuth,
            handler
        );

    }

    /**
	 *
	 * @param channelName
	 * @param handler
	 * @returns
	 */
    unglue(
        channelName: string,
        handler: ChannelHandler
    ): boolean {

        return this.#channelObject.unglue(
            channelName,
            this.#ctAuth,
            handler
        );

    }

    /**
	 *
	 * @param channelName
	 * @param params
	 * @param value
	 * @returns
	 */
    runS(
        channelName: string,
        params: Object = {},
        value?: any,
        options?: ChannelRunOptions
    ): any {

        return this.#channelObject.runS(
            channelName,
            this.#ctAuth,
            params,
            value,
            options
        );

    }

    /**
	 *
	 * @param channelName
	 * @param params
	 * @param value
	 * @param options
	 * @returns
	 */
    async runA(
        channelName: string,
        params: Object = {},
        value?: any,
        options?: ChannelRunOptions
    ): Promise<any> {

        return this.#channelObject.runA(
            channelName,
            this.#ctAuth,
            params,
            value,
            options
        );

    }

    /* Subcontroller system
    =========================== */

    /**
	 * reference to the parent controller if this controller is a sub controller - why any? because the parent controller is extending the Controller class and the reason you need a reference to that is to use non-Controller methods (you don't want to controller the parent ct from a sub ct, do you!!???)
	 */
    protected superCt?: any;

    /**
	 * list of sub controllers objects, sct id => Controller object
	 */
    #sctList: Map<string, Controller> = new Map();

    /**
	 *
	 * @param sctId
	 * @param extraSettings
	 * @param ClassRef
	 * @returns
	 */
    protected async newSubController(
        sctId?: string,
        extraSettings?: ControllerSettings,
        ClassRef?: typeof Controller
    ): Promise<Controller>;

    /**
	 *
	 * @param sctId
	 * @param ClassRef
	 */
    protected async newSubController(
        sctId?: string,
        ClassRef?: typeof Controller
    ): Promise<Controller>;

    protected async newSubController(
        sctId?: string,
        arg2?: ControllerSettings | typeof Controller,
        arg3?: typeof Controller
    ): Promise<Controller> {

        // resolving overloads
        let extraSettings: ControllerSettings;
        let ClassRef: typeof Controller;

        if (typeof arg3 === "undefined") {

            extraSettings = {};
            ClassRef = arg2 as typeof Controller;

        }
        else {

            extraSettings = arg2 as ControllerSettings;
            ClassRef = arg3 ;

        }

        this.log("msg-adding-subct", {sctId});

        // check if sct id is really unique
        if (!sctId || this.#sctList.has(sctId)) {

            const sysId = `__sct_sys_id_${this.#sctList.size}`;
            this.log.warn("warn-existing-sct-id-replaced", {
                sctId,
                newId: sysId
            }
            );
            sctId = sysId;

        }

        // computing sub controller settings
        const settings: ControllerSettings = _merge(
            {},
            this.settings,
            extraSettings
        );

        Object.assign(settings, {
            __sctId: sctId,
            __superCt:this
        });

        delete settings.__extensions;
        delete settings.__channels;

        // constructing the sub controller
        const sct = new ClassRef(this.id, settings);

        // registering the sub controller
        sct.registerCallback({
            id: this.id,
            hash: this.#ctAuth.hash,
            channelObject: this.#channelObject
        });

        // adding to the list of subcontrollers
        this.#sctList.set(sctId, sct);

        // initiating
        await sct.initCallback();

        return sct;

    }

    /* Aux tools
    ========================= */
    protected internalChan(name: string): string {

        return `${this.id}/--${name}`;

    }

}
