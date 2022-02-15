import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import YAML from "yaml";
// import prettier from "prettier";

const camelToKebab = (str) =>
    str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const file = fs.readFileSync(path.resolve("src", "template.hbs"), "utf-8");
const template = Handlebars.compile(file);

const yamlFile = fs.readFileSync(path.resolve("src", "cmds.yaml"), "utf8");
let parsedYaml = YAML.parse(yamlFile);
parsedYaml.commands = parsedYaml.commands.map((i) => ({
    ...i,
    fileName: camelToKebab(i.action) + ".js"
}));

const vars = parsedYaml;

const result = template(vars);
// const formattedCode = prettier.format(result, { parser: "babel-ts" });
fs.writeFileSync(path.resolve("src", "pg-gen.ts"), result);
