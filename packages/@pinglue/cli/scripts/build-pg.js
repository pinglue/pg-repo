#!/usr/bin/env node

import Handlebars from "handlebars";
import fs from "fs-extra";
import path from "path";
import YAML from "yaml";
import prettier from "prettier";

const TEMPLATE_FILE_NAME = "pg-ts.hbs";
const OUTPUT_FILE_NAME = "pg.ts";

const kebabToCamel = (str) =>
    str
        .toLowerCase()
        .replace(/([-_][a-z])/g, (group) =>
            group.toUpperCase().replace("-", "").replace("_", "")
        );

try {    

    const yamlText = fs.readFileSync(path.join("src", "cmds.yaml"), "utf8");
    const parsedYaml = YAML.parse(yamlText);

    for (const command of parsedYaml.commands) {

        const cmdName = command.command.split(" ")[0];
        command.fileName = `${cmdName}.js`;
        command.action = `${kebabToCamel(cmdName)}Action`;

    }

    parsedYaml.version =
        fs.readJsonSync(path.join("package.json"), "utf8")?.version || "0.0.0";    

    const templateText = fs.readFileSync(
        path.join("scripts", TEMPLATE_FILE_NAME), "utf8"
    );
    const template = Handlebars.compile(templateText.toString());

    const formattedCode = prettier.format(
        template(parsedYaml), 
        {parser: "babel-ts"}
    );

    const result = 
        `#!/usr/bin/env node\n\n${formattedCode}`;
    
    fs.writeFileSync(
        path.join("src", OUTPUT_FILE_NAME), 
        result, 
        {encoding: "utf8"}
    );

    console.log("\n\nDONE! bye!\n\n");

}
catch (error) {

    console.log("Failed:", error);

}
