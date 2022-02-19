#!/usr/bin/env node

import Handlebars from "handlebars";
import fs from "fs-extra";
import path from "path";
import YAML from "yaml";
import prettier from "prettier";

const ACTION_TEMPLATE = "action-template.hbs";
const ACTIONS_FOLDER = "actions";

const kebabToCamel = (str) =>
    str
        .toLowerCase()
        .replace(/([-_][a-z])/g, (group) =>
            group.toUpperCase().replace("-", "").replace("_", "")
        );

const templateFile = fs.readFileSync(
    path.join("scripts", ACTION_TEMPLATE),
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

const missingFileNames = allCommandsInCmdFile.filter(
    (x) => !filesInDir.includes(x)
);

for (const fileName of missingFileNames) {

    const { options } = parsedYaml.commands.find((i) =>
        i.command.startsWith(fileName)
    );
    const allFlags = [];

    for (const { flags: flag } of options) {

        if (flag.includes("<") && flag.includes(">")) {

            // Mandatory String
            const flagName = flag.split(" ")[1].replace("--", "");
            allFlags.push(kebabToCamel(flagName) + ": string;");

        }
        else if (flag.includes("[") && flag.includes("]")) {

            // Optional String
            const flagName = flag.split(" ")[1].replace("--", "");
            allFlags.push(kebabToCamel(flagName) + "?: string;");

        }
        else {

            // Boolean
            const splited = flag.split(" ");

            if (splited.length == 2) {

                const flagName = splited[1].replace("--", "");
                allFlags.push(kebabToCamel(flagName) + "?: boolean;");

            }
            else {

                const flagName = splited[0].replace("--", "");
                allFlags.push(kebabToCamel(flagName) + "?: boolean;");

            }

        }

    }

    const template = Handlebars.compile(templateFile.toString());

    const formattedCode = prettier.format(
        template({ allFlags }),
        { parser: "babel-ts" }
    );

    fs.writeFileSync(
        path.join("src", "actions", fileName + ".ts"),
        formattedCode,
        { encoding: "utf8" }
    );


}
