
/**
 * Default reducers:
 * - runMode: chain -> merge object: if no handler it'll return the init value, otherwise clean merge arr the handlers values, and then merge arr them into the init value - init value will be default to {} if it is anything otehr than object.
 * - runMode: chainBreakable -> if no handler returns any non-undefined then it'll return the initVlaue, otherwise it returns the value of the first non-undefined handler.
 */

import type {
    PgModuleMessenger,
    Object
} from "@pinglue/utils";

import {
    _default,
    _merge,
    _mergeClean,
    _clone,
    _freeze,
    _cloneFreeze,
    Msg
} from "@pinglue/utils";

//=========================================

export type ChannelRunMode
    = "chain" | "chain-breakable" | "no-value";

export type ChannelSettings = {

    runMode?: ChannelRunMode;

    singleHandler?: boolean;

    // must be handled by at least one handler
    noEmpty?: boolean;

    // whether this channel must be run sync (runS) or async (runA) or can be both - defaults to both, but it is better to narrow it down to catch bugs
    syncType?: "both" | "sync" | "async";

    // advanced checking to see if two handler outputs overwrite each others fields (in normal cases the error message identifies only one of the handlers, not two of them) good for dev/debugging - can be dropped for production to boost performance
    handlersOutputsCollisionCheck?: boolean;

    noCloneParams?: boolean;
    noCloneValue?: boolean;

    // needed only if mode is chain
    //TODO other type of mergers
    reducer?: "NA" | "object-merge" | "single-pass" | ChannelReducer;

    // the controller that registered this channel
    controllerId?: string;

    // this channel is handled by an external handler, either from another hub or another application
    externallyHandled?: boolean | {
        hubId?: string;
        appName?: string;
    };

    // this channel is handled by an external handler, either from another hub or another application
    externallyRun?: boolean | {
        hubId?: string;
        appName?: string;
    };

    // this channel proxies to another channel in another hub (the exact proxy mechanism varies and is mainly developer's responsibility - pinglue provides no official channel proxy system - it's to be done by the app architect) - Note that a proxi channel should be singleHandled with reducer "single-pass" (but the source channel can be anything)
    proxy?: boolean | {
        hubId?: string;
        channelName?: string;
    };

    // passed by channel manager
    __log?: PgModuleMessenger;

    // TODO: security stuff here

    // extra fields
    [extraField: string]: any;
};

// to be used in the runS and runA methods
export interface ChannelRunOptions {

    // restricting the handlers to those matching the pattern or patterns - for now patterns are exact equality (not sure if we ever need globe for this)
    filter?: string | string[];

    // defaults to chain - TODO: to be removed from here and replaced with mdoe in ChannelSettings
    //mode?: ChannelRunMode
}

export type ChannelHandlerMeta = {
    runner: string;
};

export type ChannelHandler = (
    params?: Object,
    value?: any, meta?: ChannelHandlerMeta
) => any;

type ChannelHandlerOutput = {

    // the value returned by the channel handler
    value?: any;

    // the id of the controller this handler belongs to
    controllerId: string;

    // any possible error happened?
    error?: any;
};

type ReducerRunInfo = {
    syncType: "sync" | "async";
    controllerId: string;
    params?: Object;
};

export type ChannelReducer = (

    outputs: (ChannelHandlerOutput)[],
    initValue?: any,

    // channel run args
    runInfo?: ReducerRunInfo
) => any;

// the format in the registers.yaml of the channels folder
export interface ChannelInfo {

    description?: string;

    settings?: ChannelSettings;

    // TODO: make them more accurate, what format for params?
    params?: Object;
    value?: Object;
    return?: Object;

}

export interface ChannelReport extends ChannelInfo {

    handlers?: {
        controllerId: string;
        functionName?: string;
    }[];

};

export type ChannelsReport = Map<string, ChannelReport>;

type HandlerInfo = {
    controllerId: string;
    // TODO: add info for the controller
    // for logging purposes, specially if the handler throws exception while running the channel this info is used to make a better log
};

type HandlerEntity = {
    handler: ChannelHandler;
    controllerId: string;
};

type RunHelperParams = {
    params: Object;
    initValue?: any;
    initValueClone?: any;
    meta: ChannelHandlerMeta;
    options: ChannelRunOptions;
};

/**
 * A channel is a set of handlers. It offers method to set/get/run handlers in this set. Each channel also has a name
 */
export class Channel {

    /**
	 * Name of the channel associated to this set
	 */
    #name: string;

    /**
     * settings of the channel (its run mode, security, restrictions, etc.)
     */
    #settings: ChannelSettings;

    /**
	 * the main data structure, handler => controllerId
	 */
    #map = new Map<ChannelHandler, HandlerInfo>();

    // for fast lookup of the handlers by controller id
    #mapCtId = new Map<string, Set<ChannelHandler>>();

    /**
	 * logger
	 */
    #log: PgModuleMessenger;

    #reducer: ChannelReducer;

    constructor(name: string, settings?: ChannelSettings) {

        // channel name
        if (!name)
            throw Msg.error("err-empty-channel-name");
        this.#name = name;

        // defaulting settings
        this.#settings = _clone(settings || {});
        this.#defaultSettings();

        this.#log = this.#settings.__log;

        // replacing pre-defined reducers
        this.#setReducer();

    }

    /**
     * Merging new info into the old one
     * @param info
     */
    mergeSettings(settings: ChannelSettings) {

        _merge(this.#settings, settings);
        this.#defaultSettings();
        this.#setReducer();

    }

    #defaultSettings() {

        // determining default reducer
        if (this.#settings.singleHandler) {

            _default(this.#settings, {
                runMode: "chain-breakable",
                syncType: "async"
            });

        }
        else {

            _default(this.#settings, {
                runMode: "chain",
                syncType: "async"
            });

        }

    }

    #setReducer() {

        if (this.#settings.runMode === "no-value") {

            this.#settings.reducer = "NA";
            this.#reducer = null;

        }

        // default
        if (!this.#settings.reducer) {

            if (this.#settings.runMode === "chain") {

                //console.log("set to object merge");

                this.#settings.reducer = "object-merge";

                this.#reducer = (outputs, initValue) =>
                    this.#objMergeReducer(outputs, initValue);

            }

            else if (this.#settings.runMode === "chain-breakable") {

                this.#settings.reducer = "single-pass";

                this.#reducer = (outputs, initValue) =>
                    this.#chainBreakableReducer(outputs, initValue);

            }

        }

        else if (
            this.#settings.reducer === "object-merge"
        ) {

            this.#reducer = (outputs, initValue) =>
                this.#objMergeReducer(outputs, initValue);

        }

        else if (
            this.#settings.reducer === "single-pass"
        ) {

            this.#reducer = (outputs, initValue) =>
                this.#chainBreakableReducer(outputs, initValue);

        }

        else if (
            this.#settings.reducer === "NA"
        ) {

            this.#reducer = () => {};

        }

        else if (typeof this.#settings.reducer === "function")
            this.#reducer = this.#settings.reducer;

        else
            this.#log.error("err-reducer-not-callable-or-predefined", {
                reducer: this.#settings.reducer
            });

    }

    /**
	 * glue (add) handler to this channel. handler can be both sync and async.
	 * @param controllerId
	 * @param handler
	 * @returns whether the glue was successful or not
     * @throws
	 */
    glue(
        controllerId: string,
        handler: ChannelHandler
    ): boolean {

        // checking single handler condition
        if (
            this.#settings.singleHandler &&
            this.#map.size >= 1
        ) {

            this.#log.error("err-single-handler-chan-glue-extra", {
                channelName: this.#name,
                controllerId,
                handler
            });

            throw Msg.error("err-single-handler-chan-glue-extra", {
                channelName: this.#name,
                controllerId
            });

        }

        // checking sync type
        if (
            this.#settings.syncType === "sync" &&
            _isAsync(handler)
        ) {

            this.#log.warn("warn-async-handler-glued-for-sync-chan", {
                channelName: this.#name,
                controllerId,
                handler
            });

        }

        if (!this.#map.has(handler)) {

            this.#map.set(handler, {controllerId});

            if (!this.#mapCtId.has(controllerId))
                this.#mapCtId.set(controllerId, new Set([handler]));
            else
                this.#mapCtId.get(controllerId).add(handler);

            return true;

        }
        else {

            this.#log.warn(
                "warn-handler-already-glued", {
                    channelName: this.#name,
                    controllerId,
                    handler
                });
            return false;

        }

    }

    /**
	 * Remove a listner from this channel
	 * @param controllerId
	 * @param handler
	 * @returns whether unglue was successful or not
	 */
    unglue(
        controllerId: string,
        handler: ChannelHandler
    ): boolean {

        if (
            this.#settings.noEmpty &&
            this.#map.size <= 1
        ) {

            this.#log.warn("warn-noempty-chan-about-to-unglue", {
                channelName: this.#name,
                controllerId,
                handler
            });

        }

        if (this.#map.has(handler)) {

            this.#map.delete(handler);

            if (this.#mapCtId.has(controllerId)) {

                this.#mapCtId.get(controllerId).delete(handler);
                if (this.#mapCtId.get(controllerId).size === 0)
                    this.#mapCtId.delete(controllerId);

            }

            return true;

        }
        else {

            this.#log.warn(
                "warn-handler-not-exists-to-unglue", {
                    channelName: this.#name,
                    controllerId,
                    handler
                });

            return false;

        }

    }

    /**
	 * clearing all the handlers from this channel - mainly to be used for testing
	 */
    clear(): void {

        this.#map.clear();
        this.#mapCtId.clear();

    }

    removeController(controllerId: string) {

        const set = this.#mapCtId.get(controllerId);
        if (!set) return;

        // removing all the handlers in the set
        for(const handler of set) {

            this.#map.delete(handler);

        }

        this.#mapCtId.delete(controllerId);

        if (
            this.#settings.noEmpty &&
            this.#map.size === 0
        ) {

            this.#log.warn("warn-noempty-chan-become-empty-after-remove-ct", {
                channelName: this.#name,
                controllerId
            });

        }

    }

    /* Sync running modes
    ================================= */

    #runSyncChain({
        params,
        initValue,
        initValueClone,
        meta,
        options
    }: RunHelperParams): any {

        const outputs: ChannelHandlerOutput[] = [];

        for(const {handler, controllerId}
            of this.#handlers(options)
        ) {

            try {

                const value = handler(
                    params,
                    initValueClone,
                    meta
                );

                if (!this.#isAsyncHandler(
                    params,
                    value,
                    controllerId
                ))
                    outputs.push({controllerId, value});
                else
                    outputs.push({
                        controllerId,
                        error: Msg.error("err-async-handler-in-sync-chan")
                    });

            }
            catch (error) {

                this.#logHandlerCrash(
                    controllerId,
                    error,
                    params
                );

                outputs.push({
                    controllerId,
                    error
                });

            }

        }

        //console.log("Gonna run reducer", this.#reducer);

        return this.#reducer(outputs, initValue);

    }

    #runSyncNoValue({
        params,
        meta,
        options
    }: RunHelperParams): any {

        for(const {handler, controllerId}
            of this.#handlers(options)
        ) {

            try {

                const value = handler(
                    params,
                    undefined,
                    meta
                );

                this.#isAsyncHandler(
                    params,
                    value,
                    controllerId
                );

            }
            catch (error) {

                this.#logHandlerCrash(
                    controllerId,
                    error,
                    params
                );

            }

        }

    }

    #runSyncChainBreakable({
        params,
        initValue,
        initValueClone,
        meta,
        options
    }: RunHelperParams): any {

        for(const {handler, controllerId}
            of this.#handlers(options)
        ) {

            try {

                const value = handler(
                    params,
                    initValueClone,
                    meta
                );

                if (this.#isAsyncHandler(
                    params,
                    value,
                    controllerId
                ))  continue;

                if (typeof value !== "undefined")
                    return this.#reducer(
                        [{controllerId, value}],
                        initValue
                    );

            }
            catch (error) {

                this.#logHandlerCrash(
                    controllerId,
                    error,
                    params
                );

            }

        }

        return this.#reducer([], initValue);

    }

    /**
	 * Runs all the handlers in this channel in sync way. A warning will be issued if any handlers returns a promise (as a potential bug). The async handlers are executed but are not part of the chaining
	 * @param params
	 * @param value
     * @param options
	 * @returns
     * @throws
	 */
    runS(
        controllerId: string,
        params: Object = {},
        initValue?: any,
        options: ChannelRunOptions = {}
    ): any {

        if (!this.#settings.controllerId)
            this.#log.warn("warn-run-s-not-reg-chan", {
                channelName: this.#name,
                controllerId
            });

        // channel should not run sync
        if (this.#settings.syncType === "async") {

            this.#log.error("err-run-s-async-chan", {
                controllerId, params, initValue
            });
            throw Msg.error("err-run-s-async-chan", {
                controllerId, params, initValue
            });

        }

        // empty channel shortcut
        if (this.#map.size === 0) {

            if (this.#settings.runMode !== "no-value")
                return this.#reducer([], initValue);
            else
                return;

        }

        // preparing the params/value
        if (!this.#settings.noCloneParams)
            params = _cloneFreeze(params);
        const initValueClone = (!this.#settings.noCloneValue) ?
            _cloneFreeze(initValue) : initValue;

        // preparing the meta
        const meta: ChannelHandlerMeta = Object.freeze({
            runner: controllerId
        });

        switch(this.#settings.runMode) {

            case "chain":
                return this.#runSyncChain({
                    params,
                    initValue,
                    initValueClone,
                    meta,
                    options
                });

            case "no-value":
                this.#runSyncNoValue({
                    params,
                    meta,
                    options
                });
                break;

            case "chain-breakable":
                return this.#runSyncChainBreakable({
                    params,
                    initValue,
                    initValueClone,
                    meta,
                    options
                });

        }

    }

    /* run async modes
    ============================ */

    async #runAsyncChain({
        params,
        initValue,
        initValueClone,
        meta,
        options
    }: RunHelperParams): Promise<any> {

        const outputs: ChannelHandlerOutput[] = await Promise.all(
            [...this.#handlers(options)].map(
                async({handler, controllerId}) => {

                    let result;

                    try {

                        result = handler(
                            params,
                            initValueClone,
                            meta
                        );

                    }
                    catch (error) {

                        // sync handler fails

                        this.#logHandlerCrash(
                            controllerId,
                            error,
                            params
                        );
                        return Promise.resolve({
                            controllerId,
                            error
                        });

                    }

                    let promise;

                    if (result instanceof Promise) {

                        promise = new Promise<ChannelHandlerOutput>(res => {

                            result
                                .then(value=>res({
                                    controllerId, value
                                }))
                                .catch(error=>{

                                    this.#logHandlerCrash(
                                        controllerId,
                                        error,
                                        params
                                    );
                                    res({
                                        controllerId,
                                        error
                                    });

                                });

                        });

                    }
                    else {

                        promise = Promise.resolve({
                            controllerId, value: result
                        });

                    }

                    return promise;

                }
            )
        );

        return this.#reducer(outputs, initValue);

    }

    async #runAsyncNoValue({
        params,
        meta,
        options
    }: RunHelperParams): Promise<any> {

        await Promise.all(
            [...this.#handlers(options)].map(
                async({handler, controllerId}) => {

                    let result;

                    try {

                        result = handler(
                            params,
                            undefined,
                            meta
                        );

                    }
                    catch (error) {

                        // sync handler fails

                        this.#logHandlerCrash(
                            controllerId,
                            error,
                            params
                        );
                        return Promise.resolve();

                    }

                    const promise =
                        result instanceof Promise
                            ? result
                            : Promise.resolve();

                    return promise.catch((error) =>
                        this.#logHandlerCrash(
                            controllerId,
                            error,
                            params
                        )
                    );

                }
            )
        );

    }

    async #runAsyncChainBreakable({
        params,
        initValue,
        initValueClone,
        meta,
        options
    }: RunHelperParams): Promise<any> {

        for(const {handler, controllerId}
            of this.#handlers(options)
        ) {

            try {

                const value = await handler(
                    params,
                    initValueClone,
                    meta
                );

                if (typeof value !== "undefined")
                    return this.#reducer(
                        [{controllerId, value}],
                        initValue
                    );

            }
            catch (error) {

                this.#logHandlerCrash(
                    controllerId,
                    error,
                    params
                );

            }

        }

        return this.#reducer([], initValue);

    }

    /**
	 * Runs the handlers in this channel in an async way
	 * @param params
	 * @param value
	 * @param options chain: whether to chain these async calls. if set to false, all handlers will be called in parallel (using Promise.all) without the value argument and nothing will return.
	 * @returns
     * @throws
	 */
    async runA(
        controllerId: string,
        params: Object = {},
        initValue?: any,
        options: ChannelRunOptions = {}
    ): Promise<any> {

        if (!this.#settings.controllerId)
            this.#log.warn("warn-run-a-not-reg-chan", {
                channelName: this.#name,
                controllerId
            });

        // channel should not run async
        if (this.#settings.syncType === "sync") {

            this.#log.error("err-run-a-sync-chan", {
                controllerId, params, initValue
            });

            throw Msg.error("err-run-a-sync-chan", {
                controllerId, params, initValue
            });

        }

        // empty channel shortcut
        if (this.#map.size === 0) {

            if (this.#settings.runMode !== "no-value")
                return this.#reducer([], initValue);
            else
                return;

        }

        // preparing the params/value
        if (!this.#settings.noCloneParams)
            params = _cloneFreeze(params);
        const initValueClone = (!this.#settings.noCloneValue) ?
            _cloneFreeze(initValue) : initValue;

        // preparing the meta
        const meta: ChannelHandlerMeta = Object.freeze({
            runner: controllerId
        });

        switch(this.#settings.runMode) {

            case "chain":
                return this.#runAsyncChain({
                    params,
                    initValue,
                    initValueClone,
                    meta,
                    options
                });

            case "no-value":
                await this.#runAsyncNoValue({
                    params,
                    meta,
                    options
                });
                break;

            case "chain-breakable":
                return this.#runAsyncChainBreakable({
                    params,
                    initValue,
                    initValueClone,
                    meta,
                    options
                });

        }

    }

    /* aux methods
    ==================== */

    #isAsyncHandler(
        params: Object,
        value: any,
        ctId: string
    ): boolean {

        // warning: async handler in a runSync chain call
        if (
            value instanceof Promise
        ) {

            this.#log.warn(
                "warn-async-handler-in-sync-chan-run", {
                    channelName: this.#name,
                    handlerFrom: ctId
                }
            );

            // catching the async error
            value.catch((error) =>
                this.#logHandlerCrash(
                    ctId,
                    error,
                    params
                )
            );

            return true;

        }

        else return false;

    }

    *#handlers(
        options: ChannelRunOptions
    ): Iterable<HandlerEntity> {

        // filtering
        const allowedCts = _normalizeAllowedCts(options.filter);

        for (const [handler, {controllerId}]
            of this.#map
        ) {

            // filtering
            if (
                allowedCts &&
                !allowedCts.includes(controllerId)
            )   continue;

            yield {handler, controllerId};

        }

    }

    /**
	 * Unifying the log for when a handler throws error
	 * @param controllerId
	 * @param error
	 * @param params
	 */
    #logHandlerCrash(
        controllerId: string,
        error: Error,
        params: Object
    ) {

        this.#log.error(
            `Unhandled error in the glued handler of controller "${controllerId}" for the channel "${this.#name}"`,
            {error, params}
        );

    }

    /**
	 *
	 */
    report(): ChannelReport {

        return {
            settings: _cloneFreeze(this.#settings),
            handlers: Array.from(
                this.#map,
                ([handler, {controllerId}]) => ({
                    controllerId,
                    functionName: handler.name
                })
            )
        };

    }

    /* predefined reducers
    ========================== */

    /**
     * CHANGES the init value! It returns the init value after merging handler outputs into it. If init value is not valid (undefined, null, non object/array) then it will DEFAULT TO {}
     * @param outputs
     * @param initValue
     * @returns
     */
    #objMergeReducer(
        outputs: (ChannelHandlerOutput)[],
        initValue: any
    ) {

        // default undefined to {}
        if (typeof initValue === "undefined")
            initValue = {};

        else if (
            initValue === null ||
            typeof initValue !== "object"
        ) {

            this.#log.warn(
                "warn-channel-init-value-not-object", {
                    channelName: this.#name,
                    initValue
                }
            );
            initValue = {};

        }

        // no result? return the init value as it is
        if (outputs.length === 0)
            return initValue;

        // merging the handlers outputs first
        const handlersValue =
            (Array.isArray(initValue)) ? [] : {};

        for(const output of outputs) {

            try {

                _mergeClean(
                    handlersValue, output.value
                );

            }
            catch(error) {

                this.#log.error(
                    "err-chan-reducer-obj-merge-failed", {
                        channelName: this.#name,
                        controllerId: output.controllerId,
                        error
                    }
                );
                return;

            }

        }

        // merging into the init value
        return _merge(
            initValue, handlersValue
        );

    }

    #chainBreakableReducer(
        outputs: (ChannelHandlerOutput)[],
        initValue: any
    ) {

        if (outputs.length === 0)
            return initValue;
        else
            return outputs[0].value;

    }

}

/* Aux functions
======================== */

function _normalizeAllowedCts(
    onlyFor?: string | string[]
): string[] | undefined {

    if (!onlyFor) return;

    if (typeof onlyFor === "string")
        return [onlyFor];

    else if (
        Array.isArray(onlyFor) &&
        onlyFor.length > 0
    )   return onlyFor;

}

// Finding out if a handler is async or not

//const AsyncFunction = (async() => {}).constructor;

function _isAsync(func: ChannelHandler) {

    //return (func instanceof AsyncFunction);

    return func.constructor.name === "AsyncFunction";

}