
import {expect} from "chai";

import {
    _getRoutes
}   from "./helpers.js";

describe("Registry utils", ()=>{

    describe("util: _getRoutes", () => {

        it("correct answer when package.json has only main field", () => {

            const PKG_JSON = {
                name: "@pinglue/some-pl",
                main: "./lib/index.js"
            };

            const ans = _getRoutes(PKG_JSON);

            expect(ans).to.have.lengthOf(1);
            expect(ans.get(".")).to.deep.equal({path: "./lib/index.js"});

        });

        it("correct answer when package.json has only exports field", () => {

            const PKG_JSON = {
                name: "@pinglue/some-pl",
                exports: {
                    ".": "./lib/index.js",
                    "./backend": "./lib/backend/index.js",
                    "./server": "./lib/server/index.js"
                }
            };

            const ans = _getRoutes(PKG_JSON);

            expect(ans).to.have.lengthOf(3);
            expect(ans.get(".")).to.deep.equal({path: "./lib/index.js"});
            expect(ans.get("./backend")).to.deep.equal({path: "./lib/backend/index.js"});
            expect(ans.get("./server")).to.deep.equal({path: "./lib/server/index.js"});

        });

        it("should normalize the exports paths correctly", () => {

            const PKG_JSON = {
                name: "@pinglue/some-pl",
                exports: {
                    ".": "./lib/index.js",
                    "/backend": "./lib/backend/index.js",
                    "server": "./lib/server/index.js"
                }
            };

            const ans = _getRoutes(PKG_JSON);

            expect(ans).to.have.lengthOf(3);
            expect(ans.get(".")).to.deep.equal({path: "./lib/index.js"});
            expect(ans.get("./backend")).to.deep.equal({path: "./lib/backend/index.js"});
            expect(ans.get("./server")).to.deep.equal({path: "./lib/server/index.js"});

        });

        it("correct answer when package.json has both main and exports field without intersection", () => {

            const PKG_JSON = {
                name: "@pinglue/some-pl",
                main: "./lib/index.js",
                exports: {
                    "./backend": "./lib/backend/index.js",
                    "./server": "./lib/server/index.js"
                }
            };

            const ans = _getRoutes(PKG_JSON);

            expect(ans).to.have.lengthOf(3);
            expect(ans.get(".")).to.deep.equal({path: "./lib/index.js"});
            expect(ans.get("./backend")).to.deep.equal({path: "./lib/backend/index.js"});
            expect(ans.get("./server")).to.deep.equal({path: "./lib/server/index.js"});

        });

        it("should overwrite the main field route with that of route's field if it contains root route", () => {

            const PKG_JSON = {
                name: "@pinglue/some-pl",
                main: "./lib/index-main.js",
                exports: {
                    ".": "./lib/index.js",
                    "./backend": "./lib/backend/index.js",
                    "./server": "./lib/server/index.js"
                }
            };

            const ans = _getRoutes(PKG_JSON);

            expect(ans).to.have.lengthOf(3);
            expect(ans.get(".")).to.deep.equal({path: "./lib/index.js"});
            expect(ans.get("./backend")).to.deep.equal({path: "./lib/backend/index.js"});
            expect(ans.get("./server")).to.deep.equal({path: "./lib/server/index.js"});

        });

        it("should return the default answer if package.json has neither main nor exports field", () => {

            const PKG_JSON = {
                name: "@pinglue/some-pl"
            };

            const ans = _getRoutes(PKG_JSON);

            expect(ans).to.have.lengthOf(1);
            expect(ans.get(".")).to.deep.equal({path: "./index.js"});

        });

        it("should return empty map is package.json object is nullish or non-object", ()=>{

            expect(_getRoutes(undefined)).to.have.lengthOf(0);
            expect(_getRoutes(null)).to.have.lengthOf(0);

        });

    });

});
