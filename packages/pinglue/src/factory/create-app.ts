
import type {
    FactorySettings,
    GetHubSettings,
    FactoryReport
} from ".";

import {Factory} from "./index.js";

import {Hub} from "../hub/index.js";

type Settings = {
    factory?: FactorySettings;
    hub?: GetHubSettings;
};

type CreateAppResponse = {
    hub?: Hub;
    factory?: Factory;
    report: FactoryReport;
};

/**
 *
 * @param route
 * @param settings
 * @returns
 * @throws
 */
export async function createApp(
    route: string = "/",
    settings: Settings = {factory: {}, hub: {}}
): Promise<CreateAppResponse> {

    const factory = new Factory(route, settings.factory);

    await factory.init();

    const {hub, report} = factory.getHub(settings.hub);

    if (hub) await hub.init();

    return {hub, report, factory};

}
