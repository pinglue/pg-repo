
import type {
    PgModuleMessenger,
    Object
} from "@pinglue/utils";

import {Msg} from "@pinglue/utils";

import {Channel} from "../channel.js";

import type {
    ChannelSettings,
    ChannelHandler,
    ChannelRunOptions,
    ChannelsReport
} from "../channel";

interface Settings {
    __log: PgModuleMessenger;
}

type ChannelInfo = {

    // channel object
    channel: Channel;

    // id of the controller that registsred this channel (if there is any)
    controllerId?: string;
};

/**
 * In charge of handling channel operations inside a pg hub
 * - implementing methods glue, unglue, runA, runS and clear
 * - keeping info about all channels (through settings)
 * - applying security check, restricting controllers from doing glue/raise actions on certain channels (to be implemented later)
 */
export class ChannelManager {

    /**
	 * Mainly used for security settings TODO: to be implemenetd later
	 */
    // private settings: Object;

    /**
	 * Map of channel name => channel object
	 */
    #chanInfo = new Map<string, ChannelInfo>();

    /**
	 * logger
	 */
    #log: PgModuleMessenger;

    constructor(settings: Settings) {

        this.#log = settings.__log;

    }

    /**
     * Registering a channel. Each channel can be registered ONLY ONCE. Otherwise will log.security.
     * @param channelName
     * @param controllerId
     * @param settings
     * @throws
     */
    public regChannel(
        channelName: string,
        controllerId: string,
        settings?: ChannelSettings
    ): void {

        this.#log("msg-registering-channel", {
            channelName, controllerId
        });

        this.authChanOperation(channelName, controllerId, {
            name: "register"
        });

        const info = this.#chanInfo
            .get(channelName);

        // already registered
        if (info?.controllerId)
            throw Msg.error("err-chan-already-registered", {
                channelName, controllerId
            });

        // channel exists but not registered
        else if (info) {

            info.controllerId = controllerId;
            info.channel.mergeSettings({
                ...settings,
                controllerId
            });

        }

        // channel does not exist
        else {

            const channel = new Channel(
                channelName,
                {...settings, controllerId, __log: this.#log}
            );
            this.#chanInfo.set(channelName, {
                controllerId, channel
            });

        }

    }

    /**
     * Modifying (merging) settings for the given channel. Only the controller that registered the channel can do this. Otherwise will log.security
     * @param channelName
     * @param controllerId
     * @param settings
     * @throws
     */
    public chanSettings(
        channelName: string,
        controllerId: string,
        settings?: ChannelSettings
    ): void {

        this.authChanOperation(channelName, controllerId, {
            name: "merge-settings"
        });

        const info = this.#chanInfo
            .get(channelName);

        // channel not exists
        if (!info) {

            throw Msg.error("err-chan-not-exist-for-settings", {
                channelName, controllerId
            });

        }

        // channel not registered
        if (!info.controllerId) {

            throw Msg.error("err-chan-not-reg-yet-for-settings", {
                channelName, controllerId
            });

        }

        // channel is not registerd by this controller
        if (info.controllerId !== controllerId) {

            throw Msg.security("err-chan-settings-attemp-non-host-ct", {
                channelName, controllerId
            });

        }

        // all good!
        info.channel.mergeSettings(settings);

    }

    /**
	 * Gluing a handler to a channel
	 * @param channelName
	 * @param controllerId
	 * @param handler
	 */
    public glue(
        channelName: string,
        controllerId: string,
        handler: ChannelHandler
    ): boolean {

        this.authChanOperation(channelName, controllerId, {
            name: "glue"
        });

        let channel = this.#chanInfo
            .get(channelName)
            ?.channel;

        if (!channel) {

            channel = new Channel(
                channelName,
                {__log: this.#log}
            );
            this.#chanInfo.set(channelName, {channel});

        }

        return channel.glue(
            controllerId,
            handler
        );

    }

    /**
	 * Ungluing a handler to a channel
	 * @param channelName
	 * @param controllerId
	 * @param handler
	 */
    public unglue(
        channelName: string,
        controllerId: string,
        handler: ChannelHandler
    ): boolean {

        this.authChanOperation(channelName, controllerId, {
            name: "unglue"
        });

        const channel = this.#chanInfo
            .get(channelName)
            ?.channel;

        if (!channel) {

            return false;

        }

        return channel.unglue(
            controllerId,
            handler
        );

    }

    public runS(
        channelName: string,
        controllerId: string,
        params?: Object,
        value?: any,
        options?: ChannelRunOptions
    ): any {

        this.authChanOperation(channelName, controllerId, {
            name: "run-s"
        });

        const channel = this.#chanInfo
            .get(channelName)
            ?.channel;

        if (channel) {

            return channel.runS(
                controllerId,
                params,
                value,
                options
            );

        }
        else {

            return value;

        }

    }

    public async runA(
        channelName: string,
        controllerId: string,
        params: Object,
        value?: any,
        options?: ChannelRunOptions
    ): Promise<any> {

        this.authChanOperation(channelName, controllerId, {
            name: "run-a"
        });

        const channel = this.#chanInfo
            .get(channelName)
            ?.channel;

        if (channel) {

            return channel.runA(
                controllerId,
                params,
                value,
                options
            );

        }
        else {

            return value;

        }

    }

    /**
	 * Check if this controller auth has permission to the channel operation - throws exception (type Result) if not allowed
	 * @param channelName
	 * @param controllerId - "hub" means the hub itself, which always has the permission
	 * @param operation
	 * @throws [[Message]] if result is not success
	 */
    private authChanOperation(
        channelName: string,
        controllerId: string,
        operation: {name: string; params?: any}
    ): void {
        // TODO: check permission if this controller can do the channel operation or not
    }

    /**
	 * Clearing a channel/or all channels
	 * @param channelName
	 * @throws [[Result]] if chnnel does not exist
	 */
    public clear(channelName?: string): void {

        if (typeof channelName === "undefined") {

            this.#chanInfo.clear();
            return;

        }

        const channel = this.#chanInfo
            .get(channelName)
            ?.channel;

        if (channel) {

            channel.clear();

        }
        else {

            throw Msg("err-channel-not-found", {
                channelName
            });

        }

    }

    public removeController(controllerId: string): void {

        for(const {channel} of this.#chanInfo.values()) {

            channel.removeController(controllerId);

        }

    }

    /**
	 *
	 */
    public report(): ChannelsReport {

        const ans: ChannelsReport = new Map();

        for (const [channelName, {channel}] of this.#chanInfo) {

            ans.set(channelName, channel.report());

        }

        return ans;

    }

}
