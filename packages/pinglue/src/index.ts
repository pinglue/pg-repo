
// main components

export type {
    ChannelRunMode,
    ChannelSettings,
    ChannelInfo,
    ChannelReport,
    ChannelHandlerMeta
} from "./channel";

export {Channel} from "./channel.js";

export {Hub} from "./hub/index.js";

export type {
    ControllerSettings
} from "./controller";

export {Controller} from "./controller.js";

// app building tools

export type {
    RegistrySettings,
    PackageInfo,
    ProjectSettings,
    PackageRecord,
    Routes,
    RouteInfo,
    RegistryWatchEvent,
    RegistryWatchEventName
} from "./registry/project-loader";

export {Registry} from "./registry/project-loader.js";

export type {
    FactorySettings,
    GenCodeSettings,
    ImportInfo
} from "./factory";

export {Factory} from "./factory/index.js";

export {createApp} from "./factory/create-app.js";
