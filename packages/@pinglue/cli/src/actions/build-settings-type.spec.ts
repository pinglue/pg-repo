import { expect } from "chai";
import { replaceModule, resetModules } from "@pinglue/utils/testing/replace-module";
import { fakeFs, fakeVolume } from "@pinglue/utils/testing/fake-fs";
import { createFakeConsole } from "@pinglue/utils/testing/fake-console";

const PG_YAML =
  `
id: mongodb-pl

envVars:
  - host
  - port
  - username
  - password

settings:

  type: object

  properties:
  
    dbName:
      type: string
      default: pinglueDB

    host:
      type: string
      default: localhost

    port:
      type: number
      default: 27017

    username:
      type: string

    password:
      type: string

    queryString:
      type: string

      
    driverOptions:
      type: object
      properties:
        useUnifiedTopology: 
          type: boolean
          default: true
`;

const PG_YAML_WO_SETTINGS =
`
id: mongodb-pl

envVars:
  - host
  - port
  - username
  - password
`;

const SETTINGS_TYPE =
`
export interface Settings {
  dbName?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  queryString?: string;
  driverOptions?: {
    useUnifiedTopology?: boolean;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
`;

describe("build-settings-type", () => {
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
    MUT = await import("./build-settings-type.js");

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

  it("should generate the correct messages and output file for the settings from pg.yaml", async () => {

    await setup({
      fakeFiles: {
        "pg.yaml": PG_YAML,
        "src": {}
      }
    });

    await action('', {});

    // see the file system
    // console.log(fakeVolume.toJSON());

    // last message was a success
    expect(fakeConsole.last().type).to.equal("success");

    const regex = new RegExp(/\s+/g);
    let returnValue = fakeFs.readFileSync("src/settings.ts", "utf8").toString().trim().replace(regex, ' ');
    let expectedValue = SETTINGS_TYPE.trim().replace(regex, ' ');

    expect(returnValue).to.equal(expectedValue);

  });

  
  it("should show the error messages if the pg.yaml file does not have settings section", async () => {

    await setup({
      fakeFiles: {
        "pg.yaml": PG_YAML_WO_SETTINGS,
      }
    });

    await action('', {});

    // see the file system
    // console.log(fakeVolume.toJSON());

    // last message was a success
    expect(fakeConsole.last().type).to.equal("error");
  });
})

