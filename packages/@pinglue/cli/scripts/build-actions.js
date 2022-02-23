#!/usr/bin/env node

import Handlebars from "handlebars";
import fs from "fs-extra";
import path from "path";
import YAML from "yaml";
import prettier from "prettier";

const ACTION_TEMPLATE = "action-template.hbs";
const ACTION_OPTIONS_TEMPLATE = "action-options-template.hbs";

const kebabToCamel = (str) =>
    str
        .toLowerCase()
        .replace(/([-_][a-z])/g, (group) =>
            group.toUpperCase().replace("-", "").replace("_", "")
        );

const actionTemplateFile = fs.readFileSync(
    path.join("scripts", ACTION_TEMPLATE),
    "utf8"
);
const optionsTemplateFile = fs.readFileSync(
    path.join("scripts", ACTION_OPTIONS_TEMPLATE),
    "utf8"
);

// Find Missing Action Files
const filesInDir = fs
    .readdirSync(path.join("src", "actions"))
    .map((i) => i.replace(".ts", ""));

const yamlText = fs.readFileSync(path.join("src", "cmds.yaml"), "utf8");
const parsedYaml = YAML.parse(yamlText);
const allCommandsInCmdFile = parsedYaml.commands.map(
    (i) => i.command.split(" ")[0]
);

// Build Action Files Options

for (const info of parsedYaml.commands) {

    const allFlags = [];

    for (const { flags } of info.options) {

        if (flags.match(/<.+>/)) {

            // Mandatory String
            const flagName = flags.split(" ")[1].replace("--", "");
            allFlags.push(kebabToCamel(flagName) + ": string;");

        }
        else if (flags.match(/\[.+\]/)) {

            // Optional String
            const flagName = flags.split(" ")[1].replace("--", "");
            allFlags.push(kebabToCamel(flagName) + "?: string;");

        }
        else {

            // Boolean
            const splitted = flags.split(" ");
            let flagName;
            flagName = splitted[splitted.length - 1].replace("--", "");
            allFlags.push(kebabToCamel(flagName) + "?: boolean;");

        }

    }

    const template = Handlebars.compile(optionsTemplateFile.toString());

    const formattedCode = prettier.format(template({ allFlags }), {
        parser: "babel-ts"
    });
    const fileName = info.command.split(" ")[0];
    fs.writeFileSync(
        path.join("src", "actions", fileName + "-options.ts"),
        formattedCode,
        { encoding: "utf8" }
    );

}

const missingFileNames = allCommandsInCmdFile.filter(
    (x) => !filesInDir.includes(x)
);

for (const fileName of missingFileNames) {

    const template = Handlebars.compile(actionTemplateFile.toString());

    const formattedCode = prettier.format(template({ fileName }), {
        parser: "babel-ts"
    });

    fs.writeFileSync(
        path.join("src", "actions", fileName + ".ts"),
        formattedCode,
        { encoding: "utf8" }
    );

}
