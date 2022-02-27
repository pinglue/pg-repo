
import EventEmitter from "events";

import type {
    Message,
    Messenger,
    Printer,
    Styler,
    Object
} from "@pinglue/utils";

import {
    _default,
    _merge,
    _freeze,
    Msg,
    emptyPrint,
    emptyStyle
} from "@pinglue/utils";

import type {
    RegistrySettings,
    PackageRecord,
    RegistryWatchEvent,
    RegistryWatchEventName
} from "../registry/project-loader";

import {Registry} from "../registry/project-loader.js";

import {Hub} from "../hub/index.js";

//==============================================

export interface FactorySettings extends RegistrySettings {

}

export interface CreateHubSettings {
    hubId?: string; //defaults to "hub" by Hub

    // extra settings for each package
    packagesSettings?: Object;

}

export interface GetHubSettings extends CreateHubSettings {
    // to be used by the hub and the controllers (not registry or factory)
    localLoggers?: Messenger | Messenger[];
}

export interface GenCodeSettings extends CreateHubSettings {

    localLoggerImports?: ImportInfo | ImportInfo[];
    hubPkgName?: string; // defaults to "pinglue" (for browser set it to "pinglue/browser")
    varPrefix?: string;
    hubVarName?: string;

}

export type ImportInfo = {
    name?: string;
    path: string;
};

export type FactoryReport = {
    results?: Message[];
    packages?: {name: string; id: string; loadError?: Message}[];
};

enum STATE {
    init,
    loading,
    loaded
}

/**
 * @emits - change, change-settings, change-source
 */
export class Factory extends EventEmitter {

    private route: string;
    private settings: FactorySettings;
    private state = STATE.init;
    private registry: Registry;
    private packages: Map<string, PackageRecord>;
    private registryError: any;
    private print: Printer;
    private style: Styler;

    constructor(
        route: string = "/",
        settings: FactorySettings = {}
    ) {

        super();

        this.route = route || "/";

        this.settings = _default({}, settings, {
            env: "dev",
            print: emptyPrint,
            style: emptyStyle
        });
        _freeze(this.settings);

        this.print = this.settings.print;
        this.style = this.settings.style;

        this.registry = new Registry(_merge(
            {}, this.settings, {
                route: this.route,
                print: this.print,
                style: this.style
            }
        ));

        // proxying events from the registry
        Registry.WATCH_EVENT_NAMES.forEach((eventName) =>
            this.registry.on(eventName, (obj) =>
                this.emit(eventName, obj)
            )
        );

    }

    public on(
        eventName: RegistryWatchEventName,
        callback: (event: RegistryWatchEvent) => void
    ) {

        return super.on(eventName, callback);

    }

    /**
	 *
	 * @returns
	 */
    public isLoaded(): boolean {

        return this.state === STATE.loaded;

    }

    public getPackages() {

        if (!this.isLoaded())
            throw Msg.error("err-factory-not-initiated");

        return this.packages;

    }

    /**
	 * @throws
	 */
    public async init(): Promise<void> {

        if (this.state === STATE.loading)
            throw Msg.error("err-loading");

        this.state = STATE.loading;

        this.print.header(
            `\nIniting the factory for the route "${this.route}"\n\n`
        );

        this.print.mute("Loading the registry ...\n");

        try {

            this.packages =
				(await this.registry.load()).data;
            this.print.success("Registry loaded!\n\n");
            this.state = STATE.loaded;

            // normalized value for the route - syncing with registry
            this.route = this.registry.route;

        }
        catch (error) {

            this.registryError = Msg.error(
                "err-registry-failed",
                {error}
            );

            this.state = STATE.init;
            throw this.registryError;

        }

    }

    /**
	 *
	 * @param settings
	 * @returns
	 * @throws
	 */
    public getHub(settings: GetHubSettings = {}): {
        hub: Hub;
        report: FactoryReport;
    } {

        if (!this.isLoaded())
            throw Msg.error("err-factory-not-initiated");

        this.print.header(
            `\nBuilding a hub for route "${this.route}"\n\n`
        );

        const report: FactoryReport = {
            results: [],
            packages: []
        };

        const hubSettings = _default(
            {},
            settings.packagesSettings?.hub,
            this.packages.get("pinglue")?.settings?.hub,
            /*{
                __env: this.packages.get("pinglue")
                    .settings?.__env?.hub || {}
            },*/
            {
                __localLoggers: settings.localLoggers
            }
        );

        // constructing the hub
        const hub = new Hub(settings.hubId, hubSettings);
        const regObject = hub.registerObject;

        // gluing the controllers
        this.print.mute("Gluing the controllers ...\n\n");

        for (const [pkgName, record] of this.packages) {

            if (pkgName === "pinglue") continue;

            this.print(
                this.style.mute("Package ") +
					this.style.bold(pkgName) +
					" - "
            );

            if (record.loadError) {

                this.print.mute(
                    `Not loaded (error: "${record.loadError.code}")\n`
                );
                continue;

            }

            const {id} = record.info;

            this.print(this.style.mute("id: ") + id);

            if (record.settings?.disabled) {

                this.print.header(" Disabled!\n");
                continue;

            }

            // gluing to the hub
            this.print("\n");

            try {

                const ctSettings = _merge(
                    {}, record.settings,
                    settings.packagesSettings?.[pkgName]
                );

                regObject.registerNew(
                    id,
                    ctSettings,
                    record.ClassRef
                );
                report.packages.push({name: pkgName, id});

            }
            catch (error) {

                report.results.push(
                    Msg.error("err-ct-register-failed", {
                        error,
                        pkgName
                    })
                );
                this.print.error("Failed!", error);

            }

            this.print("\n\n");

        }

        return {hub, report};

    }

    public genCodeImports(settings: GenCodeSettings = {}): {
        code?: string;
        report?: FactoryReport;
    } {

        if (!this.isLoaded())
            throw Msg.error("err-factory-not-initiated");

        this.print(
            `\nGenerating import code for the route "${this.route}"\n`
        );

        /*_default(settings, {
            varPrefix: ""
        });*/

        const report: FactoryReport = {
            results: [],
            packages: []
        };

        const data: {varName: string; pkgName: string}[] =
			[];

        data.push({
            varName: "{Hub}",
            pkgName: settings.hubPkgName || "pinglue"
        });

        for (const [pkgName, record] of this.packages) {

            if (pkgName === "pinglue") continue;

            this.print(
                this.style.mute("Package ") +
					this.style.bold(pkgName) +
					" - "
            );

            if (record.loadError) {

                this.print.mute(
                    `Not loaded (error: "${record.loadError.code}")\n`
                );
                continue;

            }

            if (record.settings?.disabled) {

                this.print.header(" Disabled!\n");
                continue;

            }

            data.push({
                varName: _toVarName(
                    record,
                    settings.varPrefix
                ),
                pkgName: record.importPath
            });

            this.print.success("Added!\n");

        }

        // local logger inputs
        let code = _genLoggersImportCode(
            settings.localLoggerImports,
            settings.varPrefix
        );

        if (code) code += "\n";

        code += data.reduce(
            (acc, {varName, pkgName}) =>
                acc +
				`import ${varName} from "${pkgName}";\n`,
            ""
        );

        return {code, report};

    }

    /**
	 *
	 * @param settings
	 */
    public genCodeHubConstruction(
        settings: GenCodeSettings = {}
    ): {
            code?: string;
        } {

        const hubSettings = _merge(
            {}, this.packages.get("pinglue").settings?.hub,
            settings.packagesSettings?.hub
        );

        const __localLoggers = _getLocalLoggersValue(
            settings.localLoggerImports,
            settings.varPrefix
        );

        if (__localLoggers)
            _default(hubSettings, {__localLoggers});

        const code = `const ${_toVarName(
            settings.hubVarName || "hub",
            settings.varPrefix
        )} = new Hub("${
            settings.hubId || ""
        }", ${_settingsToStr(hubSettings)});\n`;

        return {code};

    }

    /**
	 *
	 * @param settings
	 * @returns
	 */
    public genCodeCtRegs(settings: GenCodeSettings = {}): {
        code?: string;
        report?: FactoryReport;
    } {

        const report: FactoryReport = {
            results: [],
            packages: []
        };

        const hubVarName = _toVarName(
            settings.hubVarName || "hub",
            settings.varPrefix
        );

        const regObjectVarName = _toVarName(
            "regObject",
            settings.varPrefix
        );

        let code = `const ${regObjectVarName} = ${hubVarName}.registerObject;\n\n`;

        this.print(
            "\nGenerating code for gluing the controllers ...\n"
        );

        for (const [pkgName, record] of this.packages) {

            if (pkgName === "pinglue") continue;

            this.print(
                this.style.mute("Package ") +
					this.style.bold(pkgName) +
					" - "
            );

            if (record.loadError) {

                this.print.mute(
                    `Not loaded (error: "${record.loadError.code}")\n`
                );
                continue;

            }

            const {id} = record.info;

            this.print(this.style.mute("id: ") + id);

            if (record.settings?.disabled) {

                this.print.header(" Disabled!\n");
                continue;

            }

            // gluing to the hub
            this.print("\n");

            const ctSettings = _merge(
                {}, record.settings,
                settings.packagesSettings?.[pkgName]
            );

            code += `${regObjectVarName}.registerNew("${id}", ${_settingsToStr(ctSettings)}, ${_toVarName(
                record,
                settings.varPrefix
            )});\n\n`;

            //console.log(`===> ${pkgName} --- settings`, ctSettings);

            report.packages.push({name: pkgName, id});

        }

        return {code, report};

    }

    public genCodeInitHub(settings: GenCodeSettings = {}) {

        const hubVarName = _toVarName(
            settings.hubVarName || "hub",
            settings.varPrefix
        );

        return `await ${hubVarName}.init();\n`;

    }

    public genCodeStartHub(settings: GenCodeSettings = {}) {

        const hubVarName = _toVarName(
            settings.hubVarName || "hub",
            settings.varPrefix
        );

        return `await ${hubVarName}.start();\n`;

    }

}

/**
 *
 * @param id
 */
function _toVarName(varName: string, prefix?: string);
function _toVarName(record: PackageRecord, prefix?: string);
function _toVarName(
    input: string | PackageRecord,
    prefix = ""
) {

    if (typeof input === "string") return prefix + input;

    const terms = input.info.id.split("-");

    return (
        prefix +
		terms
		    .map((term) => {

		        term = term.trim().toLowerCase();

		        if (term.length > 0)
		            term =
						term.charAt(0).toUpperCase() +
						term.slice(1);

		        return term;

		    })
		    .join("")
    );

}

const LOCAL_LOGGER_BASE_NAME = "loclog";

function _genLoggersImportCode(
    localLoggerImports?: ImportInfo | ImportInfo[],
    prefix = "",
    index = 1
): string {

    if (!localLoggerImports) return "";

    if (!Array.isArray(localLoggerImports)) {

        const {name, path} = localLoggerImports;

        const varName = name
            ? `{${name} as ${prefix}${LOCAL_LOGGER_BASE_NAME}${index}}`
            : `${prefix}${LOCAL_LOGGER_BASE_NAME}${index}`;

        return `import ${varName} from "${path}";\n`;

    }
    else
        return localLoggerImports.reduce((acc, term, i) => {

            acc += _genLoggersImportCode(
                term,
                prefix,
                i + 1
            );
            return acc;

        }, "");

}

function _getLocalLoggersValue(
    localLoggerImports?: ImportInfo | ImportInfo[],
    prefix = "",
    index = 1
): string {

    if (!localLoggerImports) return "";

    if (!Array.isArray(localLoggerImports))
        return `${prefix}${LOCAL_LOGGER_BASE_NAME}${index}`;

    return (
        "[" +
		localLoggerImports
		    .map((term, i) =>
		        _getLocalLoggersValue(term, prefix, i + 1)
		    )
		    .join(", ") +
		"]"
    );

}

function _settingsToStr(val: any): string | number | null {

    if (val === null) return "null";
    if (typeof val === "undefined") return "undefined";

    if (typeof val === "number") return String(val);
    if (typeof val === "string") return `"${val}"`;
    if (typeof val === "boolean")
        return val ? "true" : "false";

    if (Array.isArray(val)) {

        return (
            "[" +
			val.map((x) => _settingsToStr(x)).join(", ") +
			"]"
        );

    }

    return (
        "{" +
		Object.entries(val)
		    .map(([key, value]) => {

		        if (key === "__localLoggers")
		            return `${_objectKeyToStr(
		                key
		            )}: ${value}`;
		        else
		            return `${_objectKeyToStr(
		                key
		            )}: ${_settingsToStr(value)}`;

		    })
		    .join(", ") +
		"}"
    );

}

function _objectKeyToStr(key: string): string {

    if (!key.match(/[^\w_]/)) return key;
    return `"${key}"`;

}
