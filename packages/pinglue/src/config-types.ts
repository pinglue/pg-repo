
export type RouteInfo = {
    path: string;
    settings?: Object;
    runtimeDependencies?: string[];
    disabled?: boolean;
    id?: string;
};

// route name format: ./term1/term2
export type Routes = Map<string, RouteInfo>;

// format of pg.yaml of packages
export type PackageInfo = {

    // id of the plugin or the parent plugin in case of sub controllers
    id: string;

    // for sub controllers
    sctId?: string;

    // ui descriptions
    title?: string;
    description?: string;

    // defaults to plugin - this field is mainly for description, not having real effect on the program (system plugins are defined in the security field of the hub settings)
    type?: "plugin" | "extension" | "system-plugin";

    settings?: Object;
    //envVars?:string[],
    //routes?: Routes
};

// format of the pg.yaml in the project root
export type ProjectSettings = {
    dataPath?: string;
};

// general structure of env and profile files data
export type CustomSettings = {
    [pkgName: string]: Object;
};