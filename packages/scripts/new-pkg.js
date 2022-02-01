#!/usr/bin/env node

const {Command} = require("commander");
const fs = require("fs-extra");
const path = require("path");
const jsonBeautify = require("json-beautify");
const micromatch = require('micromatch');
const yaml = require("yaml");


const PKG_DIR = "packages";
const TEMPLATES_DIR = "templates";


const program = new Command();
program.version("0.0.0");
program.showHelpAfterError();

program
    .argument("<pkg-name>", "Name of the package")
    .option("-t, --template <name>", "Name of the template (-> templates/name)")
    .action(action)

program.parse();


/**
 * 
 * @param {*} pkgName 
 * @param {*} options 
 */
async function action(pkgName, options) {

    const template = options.template || "empty";
    const pkgPath = path.join(PKG_DIR, pkgName);

    // check if it is defined in Lerna

    let lernaJson;
    try {
        lernaJson = await fs.readJSON("lerna.json");    
    }
    catch(error) {
        console.error("lerna.json not found! Weird!", error);
        return;
    }

    if (!Array.isArray(lernaJson["packages"])) {
        console.error("Lerna json packages field is not an array, it is", lernaJson["packages"]);
        return;
    }

    if (!micromatch.isMatch(
        `${PKG_DIR}/${pkgName}`,
        lernaJson["packages"]

    )) {
        console.log(`Package "${pkgName}" not defined in lerna.json`);
        console.log("Lerna packages: ", lernaJson["packages"]);
        return;
    }
    
    console.log(`Creating a new package at: ${pkgPath}`);

    // already exists
    if (await fs.pathExists(pkgPath)) {
        console.log(`Package "${pkgName}" already exists! Returning`);
        return;
    }
    
    // checking template
    const srcPath = path.join(
        TEMPLATES_DIR,
        template
    );
    if (!await fs.pathExists(srcPath)) {
        console.log(`Template does not exist at ${srcPath}`);
        return;
    }

    // copying
    console.log(`Copying the template from ${srcPath} to ${pkgPath}`);

    try {
        await fs.copy(srcPath, pkgPath);
    }
    catch(error) {
        console.error("Copying failed!", error);
    }

    // modifying the package json
    console.log("Modifying package.json");
    const pkgJsonPath = path.join(pkgPath, "package.json");

    let pkgJson;
    try {
        pkgJson = await fs.readJSON(pkgJsonPath);
    }
    catch(error) {
        console.error("package.json not found in the template");
        return;
    }

    pkgJson["name"] = pkgName;
    pkgJson["version"] = "0.0.0";

    try {
        await fs.writeFile(
            pkgJsonPath, 
            jsonBeautify(pkgJson, null, 2, 0)
        );
    }
    catch(error) {
        console.error("Could not modify the package.json at the destination, writing file failed!", error);
    }

    // adding id in the pg.yaml if available
    const pgyamlPath = path.join(
        pkgPath,
        "pg.yaml"
    );
    if (await fs.pathExists(pgyamlPath)) {

        console.log("Adding id to pg.yaml");

        const content = fs.readFileSync(pgyamlPath).toString("utf8");

        const json = yaml.parse(content);

        const terms = pkgName.split("/");
        const id = terms[terms.length-1];

        json["id"] = id;

        await fs.writeFile(pgyamlPath, yaml.stringify(json));

    }
    
    console.log("Done! bye!");
}

