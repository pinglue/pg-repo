
import {expect} from "chai";
import {replaceModule, resetModules} from "@pinglue/utils/testing";
import {fakeFs, fakeVolume} from "@pinglue/utils/testing/fake-fs";
import {emptyPrint as print, emptyStyle as style} from "@pinglue/utils";
import {CliActionSettings} from "../cli-settings";

const settings: CliActionSettings = {print, style};

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
`
export interface GetMongodbCollectionParams {
    name: string;
    exact?: boolean;
}

export interface GetMongodbCollectionReturn {
    [k: string]: unknown;
}

`;

describe("build-channels-types", () => {

    let action;

    // test setup
    async function setup({
        fakeFiles = {} as Record<string, any>
    } = {}) {

        await replaceModule("fs", fakeFs);
        process.chdir("/");
        fakeVolume.fromNestedJSON(fakeFiles);

        // module under test
        const Action = (await import("./build-channels-types.js")).default;
        action = Action(settings);

    }

    // tear down
    afterEach(() => {

        fakeVolume.reset();
        resetModules();
        action = undefined;

    });

    it("should generate the correct channels-types file for the root route", async() => {

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

        expect(
            fakeFs.readFileSync("src/channels-types.ts", "utf8").toString()
        ).to.equal(CHANNELS_TYPES1);

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
