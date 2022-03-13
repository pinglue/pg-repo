
import {expect} from "chai";
import {replaceModule, resetModules} from "@pinglue/utils/testing/replace-module";
import {fakeFs, fakeVolume} from "@pinglue/utils/testing/fake-fs";
import {createFakeConsole} from "@pinglue/utils/testing/fake-console";

const REGISTERS_YAML1 =
`
"get-mongodb-collection":
#==============================

  description: "Returns the MongoDB client object. Returns undefined if the client is not avaiable due to some connection error."

  settings:
    singleHandler: true

  params:
    type: object
    properties:
      name:
        type: string
      exact:
        type: boolean        
    required: ["name"]
    additionalProperties: false 

  # basically the client object, no need for schema for this
  return:
    type: object
    additionalProperties: true
`;

const CHANNELS_TYPES1 =
`export interface GetMongodbCollectionParams {
  name: string;
  exact?: boolean;
}

export interface GetMongodbCollectionReturn {
  [k: string]: unknown;
}
`;

describe("build-channels-types", () => {

    // module under test
    let MUT;

    let action;

    const {
        fakeConsole,
        fakePrint,
        fakeStyle
    } = createFakeConsole();

    // test setup
    async function setup({
        fakeFiles = {} as Record<string, any>
    } = {}) {

        await replaceModule("fs", fakeFs);
        fakeVolume.fromNestedJSON(fakeFiles);

        // module under test
        MUT = await import("./build-channels-types.js");

        // init cli action
        action = MUT.default({
            print: fakePrint,
            style: fakeStyle
        });

    }

    // tear down
    afterEach(() => {

        fakeConsole.reset();
        fakeVolume.reset();
        resetModules();
        action = undefined;

    });

    it("should generate the correct messages and output file for the root route", async() => {

        await setup({
            fakeFiles: {
                "info": {
                    "routes": {
                        "registers.yaml": REGISTERS_YAML1
                    }
                }
            }
        });

        await action("", {});

        //see the file system
        //console.log(fakeVolume.toJSON());

        // last message was a success
        expect(fakeConsole.last().type).to.equal("success");

        expect(
            fakeFs.readFileSync("src/channels-types.ts", "utf8").toString()
        ).to.equal(CHANNELS_TYPES1);

    });

    it("should show the correct error message if the registers.yaml file is not found", async() => {

        await setup({
            fakeFiles: {
                "info": {
                    "routes": {
                        "registers123.yaml": REGISTERS_YAML1
                    }
                }
            }
        });

        // building for root route
        await action("", {});
        expect(fakeConsole.last()).to.deep.equal({
            type: "warn",
            code: MUT.WARN_REGISTERS_YAML_NOT_FOUND("./")
        });

        // building for a specific route
        await action("route1", {});
        expect(fakeConsole.last()).to.deep.equal({
            type: "warn",
            code: MUT.WARN_REGISTERS_YAML_NOT_FOUND("route1")
        });

    });

    it("should generate the correct channels-types file for a specific route", async() => {

        await setup({
            fakeFiles: {
                "info": {
                    "routes": {
                        "registers.yaml": REGISTERS_YAML1,
                        "route1": {
                            "registers.yaml": REGISTERS_YAML1
                        }
                    }
                }
            }
        });
        await action("route1", {});

        expect(
            fakeFs.existsSync("src/channels-types.ts")
        ).to.be.false;

        expect(
            fakeFs.readFileSync("src/route1/channels-types.ts", "utf8").toString()
        ).to.equal(CHANNELS_TYPES1);

    });

});
