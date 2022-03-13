
import {expect} from "chai";

import path from "path";
import {ASYNC_FUNCS, SYNC_FUNCS, fsFactory} from "./fs-factory.js";
import {fs as fakeFs, vol as fakeVol} from "memfs";

describe("fs-extra-factory util", () => {

    process.chdir("/");

    afterEach(()=>{

        fakeVol.reset();

    });

    it("should contain the correct functions", () => {

        const fs = fsFactory();

        const methods = [
            ...ASYNC_FUNCS,
            ...SYNC_FUNCS
        ];

        for(const method of methods) {

            expect(fs[method]).to.be.a("function");

        }

    });

    it("pathExists methods should return correct answer", async() => {

        fakeVol.fromNestedJSON({
            dir1: {
                dir2: {
                    "file.txt": "123"
                }
            },
            "file.txt": "123"
        });
        const fs = fsFactory(fakeFs, fakeFs.promises);

        // root file
        expect(await fs.pathExists("file.txt")).to.be.true;
        expect(fs.pathExistsSync("file.txt")).to.be.true;
        expect(await fs.pathExists("file2.txt")).to.be.false;
        expect(fs.pathExistsSync("file2.txt")).to.be.false;

        // nested dir path
        expect(await fs.pathExists(path.join("dir1", "dir2"))).to.be.true;
        expect(await fs.pathExists(path.resolve("dir1", "dir2"))).to.be.true;
        expect(fs.pathExistsSync(path.join("dir1", "dir2"))).to.be.true;
        expect(fs.pathExistsSync(path.resolve("dir1", "dir2"))).to.be.true;

        // nested dir path
        expect(await fs.pathExists(path.join("dir1", "dir3"))).to.be.false;
        expect(await fs.pathExists(path.resolve("dir1", "dir3"))).to.be.false;
        expect(fs.pathExistsSync(path.join("dir1", "dir3"))).to.be.false;
        expect(fs.pathExistsSync(path.resolve("dir1", "dir3"))).to.be.false;

        // nested file
        expect(await fs.pathExists(path.join("dir1", "dir2", "file.txt"))).to.be.true;
        expect(await fs.pathExists(path.resolve("dir1", "dir2", "file.txt"))).to.be.true;
        expect(fs.pathExistsSync(path.join("dir1", "dir2", "file.txt"))).to.be.true;
        expect(fs.pathExistsSync(path.resolve("dir1", "dir2", "file.txt"))).to.be.true;

        // nested file
        expect(await fs.pathExists(path.join("dir1", "dir2", "file2.txt"))).to.be.false;
        expect(await fs.pathExists(path.resolve("dir1", "dir2", "file2.txt"))).to.be.false;
        expect(fs.pathExistsSync(path.join("dir1", "dir2", "file2.txt"))).to.be.false;
        expect(fs.pathExistsSync(path.resolve("dir1", "dir2", "file2.txt"))).to.be.false;

    });

    describe("readJSON methods", async() => {

        let fs;

        beforeEach(()=>{

            fakeVol.fromNestedJSON({
                "file.json": `{
                    "a": "aaa",
                    "b": {
                        "c": 123
                    } 
                }`,
                "file.txt": "hey"
            });
            fs = fsFactory(fakeFs, fakeFs.promises);

        });

        it("should return the object for valid json file", async()=>{

            expect(await fs.readJSON("file.json")).to.deep.equal({
                a: "aaa",
                b: {
                    c: 123
                }
            });

            expect(fs.readJSONSync("file.json")).to.deep.equal({
                a: "aaa",
                b: {
                    c: 123
                }
            });

        });

        it("should return error for invalid json file", ()=>{

            expect(()=>fs.readJSONSync("file.txt")).to.throw(/Unexpected token/);

        });

        it("should return error for non-existent json file", ()=>{

            expect(()=>fs.readJSONSync("file2.txt")).to.throw(/no such file or directory/);

        });

    });

    describe("writeJSON methods", async() => {

        let fs;
        beforeEach(()=>{

            fs = fsFactory(fakeFs, fakeFs.promises);
            fakeVol.mkdirSync(process.cwd(), { recursive: true });

        });

        it("should create the correct json file in async mode", async() => {

            await fs.writeJSON("file.json", {a: 1, b: "bbb"});
            expect(fakeVol.toJSON()).to.deep.equal({
                "/file.json": "{\"a\":1,\"b\":\"bbb\"}"
            });

        });

        it.skip("should respect overwrite flags in async mode", async() => {

            fakeVol.fromNestedJSON({
                "file.json": "123"
            });
            await fs.writeJSON("file.json", {a: 1, b: "bbb"}, {flag:"wx"});
            expect(fakeVol.toJSON()).to.deep.equal({
                "/file.json": "123"
            });
            await fs.writeJSON("file.json", {a: 1, b: "bbb"});
            expect(fakeVol.toJSON()).to.deep.equal({
                "/file.json": "{\"a\":1,\"b\":\"bbb\"}"
            });

        });

        it("should create the correct json file in sync mode", () => {

            fs.writeJSONSync("file.json", {a: 1, b: "bbb"});
            expect(fakeVol.toJSON()).to.deep.equal({
                "/file.json": "{\"a\":1,\"b\":\"bbb\"}"
            });

        });

        it.skip("should respect overwrite flag in sync mode", () => {

            fakeVol.fromNestedJSON({
                "file.json": "123"
            });
            fs.writeJSONSync("file.json", {a: 1, b: "bbb"}, {flag: "wx"});
            expect(fakeVol.toJSON()).to.deep.equal({
                "/file.json": "123"
            });
            fs.writeJSONSync("file.json", {a: 1, b: "bbb"});
            expect(fakeVol.toJSON()).to.deep.equal({
                "/file.json": "{\"a\":1,\"b\":\"bbb\"}"
            });

        });

    });

    describe("ensureFile methods", async() => {

        const INITIAL_FS = {
            "/file.txt": "123",
            "/dir1/dir2/file.txt": "123"
        };

        let fs;
        beforeEach(()=>{

            fakeVol.fromJSON(INITIAL_FS);
            fs = fsFactory(fakeFs, fakeFs.promises);
            fakeVol.mkdirSync(process.cwd(), { recursive: true });

        });

        it("should not overwrite an existing file", async() => {

            await fs.ensureFile("file.txt");
            expect(fakeVol.toJSON()).to.deep.equal(INITIAL_FS);
            await fs.ensureFile(path.join("dir1", "dir2", "file.txt"));
            expect(fakeVol.toJSON()).to.deep.equal(INITIAL_FS);

            fs.ensureFileSync("file.txt");
            expect(fakeVol.toJSON()).to.deep.equal(INITIAL_FS);
            fs.ensureFileSync(path.join("dir1", "dir2", "file.txt"));
            expect(fakeVol.toJSON()).to.deep.equal(INITIAL_FS);

        });

        it("should create the file when does not exist - in async mode", async() => {

            await fs.ensureFile("file2.txt");
            await fs.ensureFile(path.join("dir1", "dir3", "file.txt"));

            expect(fakeVol.toJSON()).to.deep.equal({
                "/file.txt": "123",
                "/file2.txt": "",
                "/dir1/dir2/file.txt": "123",
                "/dir1/dir3/file.txt": ""
            });

        });

        it("should create the file when does not exist - in sync mode", () => {

            fs.ensureFileSync("file2.txt");
            fs.ensureFileSync(path.join("dir1", "dir3", "file.txt"));

            expect(fakeVol.toJSON()).to.deep.equal({
                "/file.txt": "123",
                "/file2.txt": "",
                "/dir1/dir2/file.txt": "123",
                "/dir1/dir3/file.txt": ""
            });

        });

    });

});
