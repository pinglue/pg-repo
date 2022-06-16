import { expect } from "chai";
import { _default } from "./index.js";

let x1, x1Copy, x2, x2Copy;

describe("Test Merge functions", () => {

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

    it("Defaulting two objects - simple", () => {

        const ans = _default(x1, x2);

        expect(ans).to.deep.equal(x1);
        expect(x1).not.to.deep.equal(x1Copy);
        expect(x2).to.deep.equal(x2Copy);

        expect(ans).to.deep.equal({
            admin: true,
            arrField: ["hey"],
            author: {
                name: { last: "Smith", first: "Joe" },
                username: "joesmith"
            }
        });

    });

    it("Defaulting two objects into an empty object (deep cloning)", () => {

        const ans = _default({}, x1, x2);

        expect(ans).not.to.equal(x1);
        expect(ans.author).not.to.equal(x1.author);

        expect(x1).to.deep.equal(x1Copy);
        expect(x2).to.deep.equal(x2Copy);

        expect(ans).to.deep.equal({
            admin: true,
            arrField: ["hey"],
            author: {
                name: { last: "Smith", first: "Joe" },
                username: "joesmith"
            }
        });

    });

    it("Merging two objects into a non-empty object with deep nesting)", () => {

        const x0 = {
            admin: true,
            special: 1,
            arrField: ["hey"],
            author: {
                name: { first: "Joe0", middle: "kalbali" },
                username: "joesmith333"
            }
        };

        const x0Copy = {
            admin: true,
            special: 1,
            arrField: ["hey"],
            author: {
                name: { first: "Joe0", middle: "kalbali" },
                username: "joesmith333"
            }
        };

        const ans = _default(x0, x1, x2);

        expect(ans).to.deep.equal(x0);
        expect(ans).not.to.deep.equal(x1);
        expect(ans).not.to.deep.equal(x2);

        expect(x0).not.to.deep.equal(x0Copy);
        expect(x1).to.deep.equal(x1Copy);
        expect(x2).to.deep.equal(x2Copy);

        expect(ans).to.deep.equal({
            admin: true,
            special: 1,
            arrField: ["hey"],
            author: {
                name: { last: "Smith", first: "Joe0", middle: "kalbali" },
                username: "joesmith333"
            }
        });

    });

    it("Deep nesting with some empty objs", () => {

        const target = {
            a: 1,
            b: "b",
            c: {
                d: {
                    e: 1,
                    f: ["1", 2],
                    g: { h: [{ i: 1 }, "j"] }
                },
                k: 1
            },
            l: {
                m: {
                    n: {
                        o: {
                            p: 1
                        }
                    }
                }
            }
        };

        _default(
            target,
            { a: 2, c: { aa: 1 } },
            null,
            { c: { aa: 2 }, l: { m: { n: { oo: null } } } },
            { c: { d: { f: [1] } } },
            undefined,
            null,
            // @ts-expect-error
            { l: { m: { n: { oo: 6 } } }, l: { m: { n: { oo2: 5 } } } },
            undefined
        );

        expect(target).to.deep.equal({
            a: 1,
            b: "b",
            c: {
                d: {
                    e: 1,
                    f: ["1", 2],
                    g: { h: [{ i: 1 }, "j"] }
                },
                k: 1,
                aa: 1
            },
            l: {
                m: {
                    n: {
                        o: {
                            p: 1
                        },
                        oo: null,
                        oo2: 5
                    }
                }
            }
        });

    });

    it("Error cases, wrong types", () => {

        expect(() => {

            _default(null, { b: 1 });

        }).to.throw("err-empty-target");

        expect(() => {

            // @ts-expect-error
            _default(2, { b: 1 });

        }).to.throw("err-target-not-obj");

        expect(() => {

            // @ts-expect-error
            _default({ a: 1 }, 2);

        }).to.throw("err-obj-not-obj");

    });

});