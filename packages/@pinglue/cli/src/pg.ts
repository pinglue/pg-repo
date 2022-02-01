#!/usr/bin/env node

import "source-map-support/register.js";

import {Command} from "commander";
import {
    print,
    style,
    commanderHelp as help
} from "@pinglue/print/node";

// action functions
import infoAction from "./actions/info.js";
import runRouteAction from "./actions/run-route.js";
import envTempAction from "./actions/env-temp.js";
import channelsAction from "./actions/channels.js";
import channelsManAction from "./actions/channels-man.js";
import exportAction from "./actions/export.js";
import dumpRegAction from "./actions/dump-registry.js";

const program = new Command();

program.version("0.0.0");

program.configureHelp(help);

program.addHelpText("beforeAll", style.mute("\n~~~~~ Pinglue CLI ~~~~~\n"));

program.addHelpText("afterAll", style.mute("\nHave a nice life! \n"));

program
    .command("info [route-name]")
    .description("Show info about packages. If route provided then the info will be about that route, otherwise it'll be about general info about all routes")
    .option("-e, --env <env-type>", "Specifying the environment for the hub (defaults to local)")
    .option("-p, --profiles <profiles>", "Specifying the profiles for the hub (defaults to dev)")
    .option("-k, --pkg <package-name>", "Show info only for this package")
    .action(infoAction({style, print}));

program
    .command("run [route-name]")
    .description("Run the given route (defaults to /)")
    .option("-e, --env <env-type>", "Specifying the environment for the hub (defaults to local)")
    .option("-p, --profiles <profiles>", "Specifying the profiles for the hub (defaults to dev)")
    .option("-s, --silent", "Print nothing to the screen (for the registry and factory)")
    .option("-f, --file-log", "Use file logger as the local logger")
    .option("--no-print-logs", "Not using print logger as a local logger")
    .action(runRouteAction({print, style}));

program
    .command("export [route-name]")
    .description("generate code for the given route (defaults to /)")
    .option("-e, --env <env-type>", "Specifying the environment for the hub (defaults to local)")
    .option("-p, --profiles <profiles>", "Specifying the profiles for the hub (defaults to dev)")
    .option("-s, --silent", "Print nothing to the screen (for the registry and factory)")
    .option("-f, --file-log", "Use file logger as the local logger")
    .option("--no-print-logs", "Not using print logger as a local logger")
    .option("-b, --browser", "Browser version of the code")
    .option("-o, --output <filename>", "Output the code to the given file")
    .action(exportAction({print, style}));

program
    .command("env-temp")
    .description("Create a template env file based on plugins env info (found in pg.yaml)")
    .option("-n, --name <filename>", "Name of the environment. Default: temp")
    .option("-s, --show", "Just show the env template file on screen without writing it into the disk.")
    .action(envTempAction({print, style}));

program
    .command("channels [route-name]")
    .description("Show a realtime channel report for the given route (defaults to /) by creating a hub and show its channel report")
    .option("-e, --env <env-type>", "Specifying the environment for the hub (defaults to local)")
    .option("-p, --profiles <profiles>", "Specifying the profiles for the hub (defaults to dev)")
    .action(channelsAction({print, style}));

program
    .command("channels-man [route-name]")
    .description("Generetaes channel manual for the given route (defaults to /) based on yaml files in the channels folder of the installed pg modules")
    .option("-k, --pkg <package-name>", "Filter channels by the registering package")
    .option("-c, --channel <channel-name>", "Filter by the channel name")
    .option("-f, --full", "Show the full report for each channel (including description, params, return, etc.)")
    .option("-e, --env <env-type>", "Specifying the environment for the hub (defaults to local)")
    .option("-p, --profiles <profiles>", "Specifying the profiles for the hub (defaults to dev)")
    .action(channelsManAction({print, style}));

program
    .command("dump-registry [route-name]")
    .description("Dumps packages of the registry")
    .option("-e, --env <env-type>", "Specifying the environment for the hub (defaults to local)")
    .option("-p, --profiles <profiles>", "Specifying the profiles for the hub (defaults to dev)")
    .option("-k, --pkg <package-name>", "Show the registry record only for this package")
    .option("--no-import", "Registry option")
    .option("--no-dataPath", "Registry option")
    .option("--no-channels", "Registry option")
    .option("--no-settings", "Registry option")
    .action(dumpRegAction({print, style}));

program.parse();
