
import {expect} from "chai";
import {replaceModule, resetModules} from "@pinglue/utils/testing/replace-module";
import {fakeFs, fakeVolume} from "@pinglue/utils/testing/fake-fs";

/*import {
    buildProjectFs,
    GENERIC_PG_YAML1,
    PKG_SUIT1
} from "../testing/build-fs.js";*/

//import {print, style} from "@pinglue/print/node";

describe("project-loader", () => {

    let MUT = {} as any;
    let buildProjectFs,
        //GENERIC_PG_YAML1,
        PKG_SUIT1;    

    async function importAll() {
        await replaceModule("fs", fakeFs);
        const I = await import("../testing/build-fs.js");
        buildProjectFs = I.buildProjectFs;
        PKG_SUIT1 = I.PKG_SUIT1;

        // module under test
        MUT =  await import("./project-loader.js");
    }

    async function setup({
        fakeFiles = {} as Record<string, any>
    } = {}) {
        
        fakeVolume.fromNestedJSON(fakeFiles);

        
    }

    // tear down
    afterEach(() => {
        
        fakeVolume.reset();
        resetModules();

    });

    it("should load correct data for basic package suit and root route", async () => {

        await importAll();
        
        const packagesInfo = PKG_SUIT1();

        await setup({
            fakeFiles: buildProjectFs({
                packagesInfo,
                packageJson: {
                    name: "pg-project",
                    version: "1.2.3"
                },
                pgYaml: "type: project"
            })
        });

        const projectLoader = new MUT.Registry({
            noImport: true,
            //print, style
        });

        const {data} = await projectLoader.load();

        expect(data).to.have.lengthOf(packagesInfo.length-1);

    });

});