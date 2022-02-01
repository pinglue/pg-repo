
import {_cloneFreeze} from "../lib/object-utils/index.js";

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

    const ans = _cloneFreeze(obj);

    // clone
    expect(ans).toEqual(obj);

    // deep clone
    expect(ans).not.toBe(obj);
    expect(ans.author).not.toBe(obj.author);
    expect(ans.arrField).not.toBe(obj.arrField);
    expect(ans.config1.a).not.toBe(obj.config1.a);

    // frozen
    expect(() => {
        ans.admin = false;
    }).toThrow();

    expect(() => {
        ans.admin = true;
    }).toThrow();

    // no effect
    obj.author.username = "new-name";
    expect(ans.author.username).toBe("joesmith");
    obj.arrField.push("ggg");
    expect(ans.arrField.length).toBe(4);

    /*try {
        ans.config1.a.t = 2;
    }
    catch(error) {
        console.log(error);
    }*/

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