
import {_default} from "../lib/object-utils/index.js";

let x1, x1Copy, x2, x2Copy;

beforeEach(() => {

    x1 = {
        admin: true,
        arrField: ["hey"],
        author: {
            name: { first: 'Joe' }
        }
    };

    x1Copy = {
        admin: true,
        arrField: ["hey"],
        author: {
            name: { first: 'Joe' }
        }
    };

    x2 = {
        admin: false,
        arrField: ["hey1"],
        author: {
            name: { last: 'Smith' },
            username: 'joesmith'
        }
    }

    x2Copy = {
        admin: false,
        arrField: ["hey1"],
        author: {
            name: { last: 'Smith' },
            username: 'joesmith'
        }
    }
    
});

test("Defaulting two objects - simple", () => {
   
    const ans = _default(x1, x2);

    expect(ans).toBe(x1);
    expect(x1).not.toEqual(x1Copy);
    expect(x2).toEqual(x2Copy);

    expect(ans).toEqual({
        admin: true,
        arrField: ["hey"],
        author: {
            name: { last: 'Smith', first: 'Joe' },
            username: 'joesmith'
        }
    });  

});

test("Defaulting two objects into an empty object (deep cloning)", () => {
   
    const ans = _default({}, x1, x2);

    expect(ans).not.toBe(x1);
    expect(ans.author).not.toBe(x1.author);

    expect(x1).toEqual(x1Copy);
    expect(x2).toEqual(x2Copy);

    expect(ans).toEqual({
        admin: true,
        arrField: ["hey"],
        author: {
            name: { last: 'Smith', first: 'Joe' },
            username: 'joesmith'
        }
    });
    

});


test("Merging two objects into a non-empty object with deep nesting)", () => {

    const x0 = {
        admin: true,
        special: 1,
        arrField: ["hey"],
        author: {
            name: { first: 'Joe0', middle: "kalbali" },
            username: 'joesmith333'
        }
    };

    const x0Copy = {
        admin: true,
        special: 1,
        arrField: ["hey"],
        author: {
            name: { first: 'Joe0', middle: "kalbali" },
            username: 'joesmith333'
        }
    };
   
    const ans = _default(x0, x1, x2);

    expect(ans).toBe(x0);
    expect(ans).not.toBe(x1);
    expect(ans).not.toBe(x2);

    expect(x0).not.toEqual(x0Copy);
    expect(x1).toEqual(x1Copy);
    expect(x2).toEqual(x2Copy);

    expect(ans).toEqual({
        admin: true,
        special: 1,
        arrField: ["hey"],
        author: {
            name: { last: 'Smith', first: 'Joe0', middle: "kalbali" },
            username: 'joesmith333'
        }
    });

});


test("Deep nesting with some empty objs", () => {
    
    const target = {
        a: 1,
        b: "b",
        c: {
            d: {
                e: 1,
                f: ["1", 2],
                g: {h:[{i:1},"j"]}
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
    }

    _default(target, 
        {a:2, c:{aa:1}}, null, 
        {c:{aa:2}, l:{m:{n:{oo:null}}}},
        {c:{d:{f:[1]}}}, undefined, null,
        {l:{m:{n:{oo:6}}}, l:{m:{n:{oo2:5}}}},
        undefined
    );

    expect(target).toEqual({
        a: 1,
        b: "b",
        c: {
            d: {
                e: 1,
                f: ["1", 2],
                g: {h:[{i:1},"j"]}
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


test("Error cases, wrong types", () => {

    expect(() => {
        _default(null, {b:1})
    }).toThrow("err-empty-target");

    expect(() => {
        _default(2, {b:1})
    }).toThrow("err-target-not-obj");

    expect(() => {
        _default({a:1}, 2)
    }).toThrow("err-obj-not-obj");

    
    
});