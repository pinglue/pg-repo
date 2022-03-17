
import { expect } from "chai";
import {
    _merge,
    _mergeArr,
    _mergeClean,
    _mergeArrClean
} from "./index.js";

const funcs = [_merge, _mergeArr, _mergeClean, _mergeArrClean];

let target, obj, ans;

describe("1d objects - overwriting a single field", () => {

    beforeEach(() => {

        target = {
            field1: "field1",
            field2: 123,
            field3: false
        };

        obj = {
            field1: "field2",
            field2: 123
        };

        ans = undefined;

    });

    it("Reg merge", () => {

        ans = _merge(target, obj);
        expect(ans).to.deep.equal({
            field1: "field2",
            field2: 123,
            field3: false
        });

    });

    it("Arr merge", () => {

        ans = _mergeArr(target, obj);
        expect(ans).to.deep.equal({
            field1: "field2",
            field2: 123,
            field3: false
        });

    });

    it("Clean merge", () => {

        expect(() => {

            _mergeClean(target, obj);

        }).to.throw("err-field-overwriting");

    });

    it("Arr clean merge", () => {

        expect(() => {

            _mergeArrClean(target, obj);

        }).to.throw("err-field-overwriting");

    });

});

describe("1d objects - overwriting multi field", () => {

    beforeEach(() => {

        target = {
            field1: "field1",
            field2: 123,
            field3: false,
            field4: null,
            field5: undefined,
            field6: ["field6"],
            field7: 7,
            field8: ["1", "two"]
        };

        obj = {
            field1: "field2",
            field2: null,
            field3: undefined,
            field6: ["a", { t: 1 }],
            field8: undefined
        };

    });

    it("Reg merge", () => {

        ans = _merge(target, obj);
        expect(ans).to.deep.equal({
            field1: "field2",
            field2: null,
            field3: false,
            field4: null,
            field5: undefined,
            field6: ["a", { t: 1 }],
            field7: 7,
            field8: ["1", "two"]
        });

    });

    it("Arr merge", () => {

        ans = _mergeArr(target, obj);
        expect(ans).to.deep.equal({
            field1: "field2",
            field2: null,
            field3: false,
            field4: null,
            field5: undefined,
            field6: ["field6", "a", { t: 1 }],
            field7: 7,
            field8: ["1", "two"]
        });

    });

    it("Clean merge", () => {

        expect(() => {

            _mergeClean(target, obj);

        }).to.throw("err-field-overwriting");

    });

    it("Arr clean merge", () => {

        expect(() => {

            _mergeArrClean(target, obj);

        }).to.throw("err-field-overwriting");

    });

});

describe("Nested - overwriting", () => {

    beforeEach(() => {

        target = {
            admin: true,
            config1: null,
            config2: { h: 3 },
            config3: { h: 3 },
            arrField: ["hey"],
            author: {
                name: { first: "Joe" }
            }
        };

        obj = {
            admin: false,
            config1: { a: { t: 1 } },
            config2: null,
            config3: undefined,
            arrField: ["hey1"],
            author: {
                name: { last: "Smith" },
                username: "joesmith"
            }
        };

    });

    it("Reg merge", () => {

        ans = _merge(target, obj);
        expect(ans).to.deep.equal({
            admin: false,
            config1: { a: { t: 1 } },
            config2: null,
            config3: { h: 3 },
            arrField: ["hey1"],
            author: {
                name: { first: "Joe", last: "Smith" },
                username: "joesmith"
            }
        });

    });

    it("Arr merge", () => {

        ans = _mergeArr(target, obj);
        expect(ans).to.deep.equal({
            admin: false,
            config1: { a: { t: 1 } },
            config2: null,
            config3: { h: 3 },
            arrField: ["hey", "hey1"],
            author: {
                name: { first: "Joe", last: "Smith" },
                username: "joesmith"
            }
        });

    });

    it("Clean merge", () => {

        expect(() => {

            _mergeClean(target, obj);

        }).to.throw("err-field-overwriting");

    });

    it("Arr clean merge", () => {

        expect(() => {

            _mergeArrClean(target, obj);

        }).to.throw("err-field-overwriting");

    });

});

describe("Merge into empty object (deep cloning)", () => {

    beforeEach(() => {

        target = {};

        obj = {
            admin: false,
            config1: { a: { t: 1 } },
            config2: null,
            config3: undefined,
            arrField: ["hey1"],
            author: {
                name: { last: "Smith" },
                username: "joesmith"
            }
        };

    });

    it("Reg merge", () => {

        const ans = _merge(target, obj);
        expect(target).to.deep.equal(obj);
        expect(ans).to.equal(target);
        expect(ans).not.to.equal(obj);

    });

    it("Arr merge", () => {

        const ans = _merge(target, obj);
        expect(target).to.deep.equal(obj);
        expect(ans).to.equal(target);
        expect(ans).not.to.equal(obj);

    });

    it("Clean merge", () => {

        const ans = _merge(target, obj);
        expect(target).to.deep.equal(obj);
        expect(ans).to.equal(target);
        expect(ans).not.to.equal(obj);

    });

    it("Arr clean merge", () => {

        const ans = _merge(target, obj);
        expect(target).to.deep.equal(obj);
        expect(ans).to.equal(target);
        expect(ans).not.to.equal(obj);

    });

});

describe("Nested - no overwrite", () => {

    beforeEach(() => {

        target = {
            config2: { h: 3 },
            config3: 3,
            arrField: undefined,
            author: {
                name: { first: "Joe", nested2: { t: 1 } }
            }
        };

        obj = {
            admin: false,
            config1: { a: { t: 1 } },
            config3: undefined,
            arrField: ["hey1"],
            author: {
                name: { last: "Smith", nested2: { t2: [1, 2, 3], t3: { t3: 2 } } },
                username: "joesmith"
            }
        };

        ans = {
            admin: false,
            config1: { a: { t: 1 } },
            config2: { h: 3 },
            config3: 3,
            arrField: ["hey1"],
            author: {
                name: {
                    first: "Joe",
                    last: "Smith",
                    nested2: {
                        t: 1,
                        t2: [1, 2, 3],
                        t3: { t3: 2 }
                    }
                },
                username: "joesmith"
            }
        };

    });

    it("Reg merge", () => {

        expect(_merge(target, obj)).to.deep.equal(ans);

    });

    it("Arr merge", () => {

        expect(_mergeArr(target, obj)).to.deep.equal(ans);

    });

    it("Clean merge", () => {

        expect(_mergeClean(target, obj)).to.deep.equal(ans);

    });

    it("Arr clean merge", () => {

        expect(_mergeArrClean(target, obj)).to.deep.equal(ans);

    });

});

describe("Nested - overwrite only for array fields", () => {

    beforeEach(() => {

        target = {
            config2: { h: 3 },
            config3: 3,
            arrField: ["hey0"],
            author: {
                name: { first: "Joe", nested2: { t: 1, t2: [1, 2, 3] } }
            }
        };

        obj = {
            admin: false,
            config1: { a: { t: 1 } },
            config3: undefined,
            arrField: ["hey1", "hey2"],
            author: {
                name: { last: "Smith", nested2: { t2: [4, 5, 6], t3: { t3: 2 } } },
                username: "joesmith"
            }
        };

    });

    it("Reg merge", () => {

        _merge(target, obj);

        expect(target).to.deep.equal({
            admin: false,
            config1: { a: { t: 1 } },
            config2: { h: 3 },
            config3: 3,
            arrField: ["hey1", "hey2"],
            author: {
                name: {
                    first: "Joe",
                    last: "Smith",
                    nested2: {
                        t: 1,
                        t2: [4, 5, 6],
                        t3: { t3: 2 }
                    }
                },
                username: "joesmith"
            }
        });

    });

    it("Arr merge", () => {

        _mergeArr(target, obj);

        expect(target).to.deep.equal({
            admin: false,
            config1: { a: { t: 1 } },
            config2: { h: 3 },
            config3: 3,
            arrField: ["hey0", "hey1", "hey2"],
            author: {
                name: {
                    first: "Joe",
                    last: "Smith",
                    nested2: {
                        t: 1,
                        t2: [1, 2, 3, 4, 5, 6],
                        t3: { t3: 2 }
                    }
                },
                username: "joesmith"
            }
        });

    });

    it("Clean merge", () => {

        expect(() => {

            _mergeClean(target, obj);

        }).to.throw("err-field-overwriting");

    });

    it("Arr clean merge", () => {

        _mergeArrClean(target, obj);

        expect(target).to.deep.equal({
            admin: false,
            config1: { a: { t: 1 } },
            config2: { h: 3 },
            config3: 3,
            arrField: ["hey0", "hey1", "hey2"],
            author: {
                name: {
                    first: "Joe",
                    last: "Smith",
                    nested2: {
                        t: 1,
                        t2: [1, 2, 3, 4, 5, 6],
                        t3: { t3: 2 }
                    }
                },
                username: "joesmith"
            }
        });

    });

});

describe("Merging two arrays", () => {

    beforeEach(() => {

        target = [1, "2", true];

        obj = [{ t: 1 }, 2, "3", [1, "6"]];

        ans = [1, "2", true, { t: 1 }, 2, "3", [1, "6"]];

    });

    it("Reg merge", () => {

        expect(() => {

            _merge(target, obj);

        }).to.throw("err-merging-arrays-no-merge-options-set");

    });

    it("Arr merge", () => {

        expect(_mergeArr(target, obj)).to.deep.equal(ans);

    });

    it("Clean merge", () => {

        expect(() => {

            _mergeClean(target, obj);

        }).to.throw("err-merging-arrays-no-merge-options-set");

    });

    it("Clean arr merge", () => {

        expect(_mergeArr(target, obj)).to.deep.equal(ans);

    });

});

describe("Null/undefined params", () => {

    let x;

    beforeEach(() => {

        x = {
            admin: true,
            config1: null,
            config2: { h: 3 },
            config3: { h: 3 },
            arrField: ["hey"],
            author: {
                name: { first: "Joe" }
            }
        };

    });

    it("Undefined target", () => {

        for (const f of funcs) {

            expect(() => {

                f(undefined, x);

            }).to.throw("err-empty-target");

        }

    });

    it("Null target", () => {

        for (const f of funcs) {

            expect(() => {

                f(null, x);

            }).to.throw("err-empty-target");

        }

    });

    it("Undefined obj", () => {

        for (const f of funcs) {

            expect(f(x, undefined)).to.deep.equal(x);

        }

    });

    it("Null obj", () => {

        for (const f of funcs) {

            expect(f(x, null)).to.deep.equal(x);

        }

    });

    it("Null party", () => {

        for (const f of funcs) {

            expect(() => {

                f(null, null);

            }).to.throw("err-empty-target");

            expect(() => {

                f(undefined, null);

            }).to.throw("err-empty-target");

            expect(() => {

                f(null, undefined);

            }).to.throw("err-empty-target");

            expect(() => {

                f(undefined, undefined);

            }).to.throw("err-empty-target");

        }

    });

});

describe("Unmatched types (1d case)", () => {

    it("primitive/array -> obj", () => {

        for (const f of funcs) {

            expect(() => {

                // @ts-expect-error
                f({ t: 3 }, 1);

            }).to.throw("err-obj-not-objarr");

            expect(() => {

                // @ts-expect-error
                f({ t: 3 }, "1");

            }).to.throw("err-obj-not-objarr");

            expect(() => {

                // @ts-expect-error
                f({ t: 3 }, true);

            }).to.throw("err-obj-not-objarr");

            expect(() => {

                f({ t: 3 }, [1, 2, "3"]);

            }).to.throw("err-merging-array-to-object");

        }

    });

    it("Miscs types", () => {

        for (const f of funcs) {

            expect(() => {

                // @ts-expect-error
                f(1, 2);

            }).to.throw("err-target-not-objarr");

            expect(() => {

                // @ts-expect-error
                f(1, "2");

            }).to.throw("err-target-not-objarr");

            expect(() => {

                // @ts-expect-error
                f(true, { t: 4 });

            }).to.throw("err-target-not-objarr");

            expect(() => {

                // @ts-expect-error
                f(true, null);

            }).to.throw("err-target-not-objarr");

            expect(() => {

                // @ts-expect-error
                f(true, undefined);

            }).to.throw("err-target-not-objarr");

            expect(() => {

                f([1, 2], { t: 4 });

            }).to.throw("err-merging-object-to-array");

        }

    });

});
