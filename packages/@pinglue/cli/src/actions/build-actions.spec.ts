import { expect } from "chai";
import {
    replaceModule,
    resetModules
} from "@pinglue/utils/testing/replace-module";
import { fakeFs, fakeVolume } from "@pinglue/utils/testing/fake-fs";

const COMMANDS_YAML = `
description: "Test file to check build action and option files"

commands:
  - command: "test [route-name]"
    description: "Test Command to check if it works"
    options:
      - flags: "-o, --optional <env-type>"
        description: "optional input"
      - flags: "-m, --mandatory [profiles]"
        description: "mandatory input"
      - flags: "-b, --boolean"
        description: "Boolean two flag"
      - flags: "--boolean-one-flag"
        description: "Boolean one flag"
`;

const TEST_FILE = `
import type { CliActionSettings } from "../cli-settings";

import { Options } from "./test-options";

export default function (settings: CliActionSettings) {
  const { print, style } = settings;

  return async (route: string, options: Options) => {
    // start here
  };
}
`;

const TEST_OPTION = `
export interface Options {
  optional: string;
  mandatory?: string;
  boolean?: boolean;
  booleanOneFlag?: boolean;
}
`;

const ACTION_TEMPLATE = `
import type {
  CliActionSettings
} from "../cli-settings";

import { Options } from "./{{{fileName}}}-options"

export default function(settings: CliActionSettings) {

  const {print, style} = settings;

  return async(
      route: string, options: Options
  ) => {
     // start here
 };
}
`;

const OPTION_TEMPLATE = `
export interface Options {
    {{#each allFlags}}
      {{this}}
    {{/each}}
    };
`;

describe("build-actions", () => {

    // module under test
    let MUT;

    let action;

    // test setup
    async function setup({ fakeFiles = {} } = {}) {

        await replaceModule("fs", fakeFs);
        fakeVolume.fromNestedJSON(fakeFiles);

        // module under test
        MUT = await import("../../scripts/build-actions.js");

        // init cli action
        action = MUT.default;

    }

    afterEach(() => {

        fakeVolume.reset();
        resetModules();
        action = undefined;

    });

    it("should generate one action file and one option file", async() => {

        await setup({
            fakeFiles: {
                src: {
                    "cmds.yaml": COMMANDS_YAML,
                    actions: {}
                },
                scripts: {
                    "action-template.hbs": ACTION_TEMPLATE,
                    "action-options-template.hbs": OPTION_TEMPLATE
                }
            }
        });

        await action();

        expect(TEST_FILE).to.contain(
            fakeFs.readFileSync("./src/actions/test.ts", "utf8")
        );
        expect(TEST_OPTION).to.contain(
            fakeFs.readFileSync("./src/actions/test-options.ts", "utf8")
        );

    });

});
