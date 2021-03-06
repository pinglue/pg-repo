import { CliActionSettings } from "cli-settings";
import fs from "fs-extra";
import path from "path";
import yaml from "yaml";
import jsonToTypeScript from "json-schema-to-typescript";

export const WARN_REGISTERS_YAML_NOT_FOUND = (routeName) => `registers.yaml not found for route "${routeName}". Aborted. \n`;

function getVariableName(
    channelName: string,
    type: string
) {

    // case of local channel
    if (channelName.startsWith("--"))
        channelName = "_" + channelName.substring(2);

    // to pascal case
    return `${channelName}-${type}`.replace(
        /(^|\_|\-)[A-Za-z0-9]/g,
        (m) => m.toUpperCase().substring(m.startsWith("-") ? 1 : 0)
    );

}

export default function(settings: CliActionSettings) {

    const {print, style} = settings;

    return async(routeName: string, options: any) => {

        routeName = routeName || "./";

        // Find registers.yaml file and read
        print("Loading registers.yaml file...\n");

        const filepath = path.join("info", "routes", routeName, "registers.yaml");

        const file =
      fs.pathExistsSync(filepath) &&
      fs.readFileSync(filepath, "utf8");

        if (!file) {

            print.warn(WARN_REGISTERS_YAML_NOT_FOUND(routeName));
            return;

        }

        print("registers.yaml file found. compiling...\n");

        // 1. Convert each yaml to json,
        // 2. Get each channel data.
        // 3. Create 3 types (params / value / return) in string format.
        const promises: Promise<string>[] = [];
        let results: string[];
        let channels: {[k: string]: {[k: string]: any}};

        try{

            channels = yaml.parse(file, {prettyErrors: true});

        }
        catch(error) {

            print.error("Could not compile register.yaml into json format. It may be caused because registers.yaml has incorrect format:", error);
            return;

        }

        for(const [channelName, info] of Object.entries(channels)) {

            for(const type of ["params", "value", "return"]) {

                if (!info[type]) continue;
                promises.push(jsonToTypeScript.compile(
                    info[type],
                    getVariableName(channelName, type),
                    {bannerComment: null}
                ));

            }

        }

        if(promises.length == 0) {

            print.warn("No definition found in registers.yaml. To proceed, registers.yaml should have at least one of [params, value, return] properties.\n");
            return;

        }

        try {

            results = await Promise.all(promises);

        }
        catch (error) {

            print.error("Could not compile json data into typescript format properly. It may be caused because registers.yaml has incorrect format\n");
            print("Here is more information.");
            print(style.errorObj(error));
            return;

        }

        print.success("Compile done. exporting...\n");

        const dirToWrite = path.join("./src", routeName);
        const destPath = path.join(dirToWrite, "channels-types.ts");

        try {

            fs.ensureDirSync(dirToWrite);
            fs.writeFileSync(destPath, results.join("\n"));

        }
        catch (error) {

            print.error("Could not export type definitions in channels-types.ts file.", error);
            return;

        }

        print.success(`Output file is located at ${destPath}\n`);

    };

}
