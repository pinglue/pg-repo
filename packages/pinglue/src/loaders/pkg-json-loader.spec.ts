
import chai, {expect} from "chai";
import path from "path";
import {setTimeout} from 'timers/promises';
import {fakeFs, fakeVolume} from "@pinglue/utils/testing/fake-fs";
import {fsFactory} from "@pinglue/utils/bm-factories";

import {PkgJsonLoader} from "./pkg-json-loader.js";
import { LoadEvent, LoadEventSourceType, LoadEventType } from "./loader.js";
import { Msg } from "@pinglue/utils";

const PKG_JSON1_TEXT =  
`
{
    "name": "@pinglue/pkg1",
    "version": "0.0.0",
    "type": "module"
}
`;
const PKG_JSON1_DATA = {
    name: "@pinglue/pkg1",
    version: "0.0.0",
    type: "module"
};

const PKG_JSON2_TEXT =  
`
{
    "name": "@pinglue/pkg2",
    "version": "0.0.0",
    "type": "module"
}
`;
const PKG_JSON2_DATA = {
    name: "@pinglue/pkg2",
    version: "0.0.0",
    type: "module"
};


describe("pkg json loader", () => {

    process.chdir("/");

    let loader: PkgJsonLoader;

    function setup({
        pkgJsonText = PKG_JSON1_TEXT as string|null,
        pkgPath = "" as string,
        watch = true as boolean
    }={}) {        

        if (pkgJsonText !== null) {
            fakeVolume.fromJSON({
                [`/${pkgPath}${pkgPath?"/":""}package.json`]: pkgJsonText
            });
        }

        loader = new PkgJsonLoader({
            fs: fsFactory(fakeFs, fakeFs.promises),
            watch
        });

    }

    afterEach(()=>{

        fakeVolume.reset();
        loader?.close();

    });


    it("should load the correct data when package.json exists and is valid",
    async () => {

        setup();
        let c = 0;

        loader.load$.subscribe((event: LoadEvent)=>{
            if (++c === 1) {
                expect(event).to.deep.equal({
                    dataChangeInfo: {
                        type: LoadEventType.INITIAL_LOAD,
                        filePath: "/package.json"
                    },
                    data: PKG_JSON1_DATA,
                    changedSourceType: LoadEventSourceType.PKG_JSON,
                    pkgName: PKG_JSON1_DATA.name
                });                
            }
        });

        await setTimeout(5);

        expect(c).to.equal(1);

    });

    it("should load the correct error data when package.json does not exist",
    async () => {

        setup({pkgJsonText: null});
        let c = 0;

        loader.load$.subscribe((event: LoadEvent)=>{          

            if (++c === 1) {
                expect(event).to.deep.contains({
                    dataChangeInfo: {
                        type: LoadEventType.INITIAL_LOAD
                    }
                });
                expect(event.error.code).to.equal("err-file-read-failed");
                expect(event.error.data.error).to.be.ok;
            }
        });

        await setTimeout(5);
        expect(c).to.equal(1);

    });

    it("should load the correct error data when package.json has invalid format",
    async () => {

        setup({pkgJsonText: "{haha!"});
        let c = 0;

        loader.load$.subscribe((event: LoadEvent)=>{           

            if (++c === 1) {
                expect(event).to.deep.contains({
                    dataChangeInfo: {
                        type: LoadEventType.INITIAL_LOAD
                    }
                });
                expect(event.error.code).to.equal("err-invalid-json-format");
                expect(event.error.data.error).to.be.ok;
            }
        });

        await setTimeout(5);
        expect(c).to.equal(1);

    });

    it("should emit the correct data in watch mode when package.json changes and is valid",
    async () => {

        setup();
        let c = 0;

        loader.load$.subscribe((event: LoadEvent)=>{

            if (event.error) return;

            switch(++c) {
                case 1: {
                    expect(event.dataChangeInfo.type).to.equal(LoadEventType.INITIAL_LOAD);
                    expect(event.data).to.deep.equal(PKG_JSON1_DATA);
                    break;
                }
                case 2: {
                    expect(event).to.deep.equal({
                        dataChangeInfo: {
                            type: LoadEventType.CHANGE,
                            filePath: "/package.json"
                        },
                        data: PKG_JSON2_DATA,
                        changedSourceType: LoadEventSourceType.PKG_JSON,
                        pkgName: PKG_JSON2_DATA.name
                    });
                    break;
                }
            }
        });

        await setTimeout(10);
        fakeFs.writeFileSync("/package.json", PKG_JSON2_TEXT);

        await setTimeout(10);
        expect(c).to.equal(2);

    });

    it("should emit the correct data in non-watch mode when package.json changes and is valid",
    async () => {

        setup({watch: false});
        let c = 0;

        loader.load$.subscribe((event: LoadEvent)=>{

            if (event.error) return;

            switch(++c) {
                case 1: {
                    expect(event.dataChangeInfo.type).to.equal(LoadEventType.INITIAL_LOAD);
                    expect(event.data).to.deep.equal(PKG_JSON1_DATA);
                    break;
                }                
            }
        });

        await setTimeout(10);
        fakeFs.writeFileSync("/package.json", PKG_JSON2_TEXT);

        await setTimeout(10);
        expect(c).to.equal(1);

    });

});