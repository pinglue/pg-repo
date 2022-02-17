import Handlebars from "handlebars";
import fs from "fs-extra";
import path from "path";
import YAML from "yaml";
import prettier from "prettier";

const camelToKebab = (str) =>
    str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const kebabToCamel = (str) =>
    str
        .toLowerCase()
        .replace(/([-_][a-z])/g, (group) =>
            group.toUpperCase().replace("-", "").replace("_", "")
        );

try {

    const file = fs.readFileSync(path.join("src", "template.hbs"), "utf-8");
    const template = Handlebars.compile(file);

    const yamlFile = fs.readFileSync(path.join("src", "cmds.yaml"), "utf-8");
    let parsedYaml = YAML.parse(yamlFile);

    for (const command of parsedYaml.commands) {

        command.fileName = command.command.split(" ")[0] + ".js";
        command.action = kebabToCamel(command.command.split(" ")[0]);

    }
    parsedYaml.version =
    fs.readJsonSync(path.join("package.json"))?.version || "0.0.0";

    const vars = parsedYaml;

    const result = template(vars);
    const formattedCode = prettier.format(result, { parser: "babel-ts" });
    fs.writeFileSync(path.join("src", "pg-gen.ts"), formattedCode);

}
catch (error) {

    console.log(error);

}
