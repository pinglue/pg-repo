

import {_freeze} from "../lib/object-utils/index.js";

test("Test 1", () => {

    const obj = {
        admin: false,
        config1: {a: {t:1}},
        config2: null,
        config3: undefined,
        arrField: [1,2,"hey1", true],
        author: {
            name: { last: 'Smith' },
            username: 'joesmith'
        }
    };

    const ans = _freeze(obj);

    
    

    // Same object    
    expect(ans).toBe(obj);
    expect(ans.author).toBe(obj.author);
    expect(ans.arrField).toBe(obj.arrField);
    expect(ans.config1.a).toBe(obj.config1.a);

    // frozen
    expect(() => {
        ans.admin = false;
    }).toThrow(/(read only)|(not extensible)/);
    expect(() => {
        obj.admin = false;
    }).toThrow(/(read only)|(not extensible)/);
    expect(() => {
        ans.admin = true;
    }).toThrow(/(read only)|(not extensible)/);
    expect(() => {
        obj.admin = true;
    }).toThrow(/(read only)|(not extensible)/);

    // deep frozen
    expect(() => {
        ans.config1.a.t = 2;
    }).toThrow(/(read only)|(not extensible)/);
    expect(() => {
        ans.author.username = "shalgham";
    }).toThrow(/(read only)|(not extensible)/);
    expect(() => {
        ans.arrField.push(34);
    }).toThrow(/(read only)|(not extensible)/);
    expect(() => {
        ans.arrField.splice(1,1, "hom");
    }).toThrow(/(read only)|(not extensible)/);    
});