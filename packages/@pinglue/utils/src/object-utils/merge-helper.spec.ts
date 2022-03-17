
import { expect } from "chai";
import { _merge } from "./index.js";

let x1, x1Copy, x2, x2Copy;

beforeEach(() => {

    x1 = {
        admin: true,
        arrField: ["hey"],
        author: {
            name: { first: "Joe" }
        }
    };

    x1Copy = {
        admin: true,
        arrField: ["hey"],
        author: {
            name: { first: "Joe" }
        }
    };

    x2 = {
        admin: false,
        arrField: ["hey1"],
        author: {
            name: { last: "Smith" },
            username: "joesmith"
        }
    };

    x2Copy = {
        admin: false,
        arrField: ["hey1"],
        author: {
            name: { last: "Smith" },
            username: "joesmith"
        }
    };

});

it("Merging two objects", () => {

    const ans = _merge(x1, x2);

    expect(ans).to.deep.equal(x1);
    expect(ans).to.deep.equal({
        admin: false,
        arrField: ["hey1"],
        author: {
            name: { last: "Smith", first: "Joe" },
            username: "joesmith"
        }
    });
    expect(x2).to.deep.equal(x2Copy);

});

it("Merging two objects into an empty object (deep cloning)", () => {

    const ans = _merge({}, x1, x2);

    expect(ans).not.to.deep.equal(x1);
    expect(ans.author).not.to.equal(x1.author);

    expect(x1).to.deep.equal(x1Copy);
    expect(x2).to.deep.equal(x2Copy);

    expect(ans).to.deep.equal({
        admin: false,
        arrField: ["hey1"],
        author: {
            name: { last: "Smith", first: "Joe" },
            username: "joesmith"
        }
    });

});

it("Merging two objects into a non-empty object (deep cloning)", () => {

    const x0 = {
        admin: true,
        special: 1,
        arrField: ["hey"],
        author: {
            name: { first: "Joe", middle: "kalbali" },
            username: "joesmith333"
        }
    };

    const x0Copy = {
        admin: true,
        special: 1,
        arrField: ["hey"],
        author: {
            name: { first: "Joe", middle: "kalbali" },
            username: "joesmith333"
        }
    };

    const ans = _merge(x0, x1, x2);

    expect(ans).to.deep.equal(x0);
    expect(ans).not.to.deep.equal(x1);
    expect(ans).not.to.deep.equal(x2);

    expect(x0).not.deep.equal(x0Copy);
    expect(x1).to.deep.equal(x1Copy);
    expect(x2).to.deep.equal(x2Copy);

    expect(ans).deep.equal({
        admin: false,
        special: 1,
        arrField: ["hey1"],
        author: {
            name: { last: "Smith", first: "Joe", middle: "kalbali" },
            username: "joesmith"
        }
    });

});