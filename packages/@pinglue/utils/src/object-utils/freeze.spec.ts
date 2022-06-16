import { expect } from "chai";
import { _freeze } from "./index.js";

describe("Test Freeze", () => {

    it("Test freeze function", () => {

        const obj = {
            admin: false,
            config1: { a: { t: 1 } },
            config2: null,
            config3: undefined,
            arrField: [1, 2, "hey1", true],
            author: {
                name: { last: "Smith" },
                username: "joesmith"
            }
        };

        const ans = _freeze(obj);

        // Same object
        expect(ans).to.equal(obj);
        expect(ans.author).to.equal(obj.author);
        expect(ans.arrField).to.equal(obj.arrField);
        expect(ans.config1.a).to.equal(obj.config1.a);

        // frozen
        expect(() => {

            ans.admin = false;

        }).to.throw(/(read only)|(not extensible)/);
        expect(() => {

            obj.admin = false;

        }).to.throw(/(read only)|(not extensible)/);
        expect(() => {

            ans.admin = true;

        }).to.throw(/(read only)|(not extensible)/);
        expect(() => {

            obj.admin = true;

        }).to.throw(/(read only)|(not extensible)/);

        // deep frozen
        expect(() => {

            ans.config1.a.t = 2;

        }).to.throw(/(read only)|(not extensible)/);
        expect(() => {

            ans.author.username = "shalgham";

        }).to.throw(/(read only)|(not extensible)/);
        expect(() => {

            ans.arrField.push(34);

        }).to.throw(/(read only)|(not extensible)/);
        expect(() => {

            ans.arrField.splice(1, 1, "hom");

        }).to.throw(/(read only)|(not extensible)/);

    });

});