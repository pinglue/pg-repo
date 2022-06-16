import { expect } from "chai";
import { _cloneFreeze } from "./index.js";

describe("cloneFreeze", () => {

    it("Test cloneFreeze function", () => {

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

        const ans = _cloneFreeze(obj);

        // clone
        expect(ans).to.deep.equal(obj);

        // deep clone
        expect(ans).not.to.equal(obj);
        expect(ans.author).not.to.equal(obj.author);
        expect(ans.arrField).not.to.equal(obj.arrField);
        expect(ans.config1.a).not.to.equal(obj.config1.a);

        // frozen
        expect(() => {

            ans.admin = false;

        }).throw();

        expect(() => {

            ans.admin = true;

        }).throw();

        // no effect
        obj.author.username = "new-name";
        expect(ans.author.username).to.equal("joesmith");
        obj.arrField.push("ggg");
        expect(ans.arrField.length).to.equal(4);

        /*try {
            ans.config1.a.t = 2;
        }
        catch(error) {
            console.log(error);
        }*/

        // deep frozen
        expect(() => {

            ans.config1.a.t = 2;

        }).throw(/(read only)|(not extensible)/);
        expect(() => {

            ans.author.username = "shalgham";

        }).throw(/(read only)|(not extensible)/);
        expect(() => {

            ans.arrField.push(34);

        }).throw(/(read only)|(not extensible)/);
        expect(() => {

            ans.arrField.splice(1, 1, "hom");

        }).throw(/(read only)|(not extensible)/);

    });

});