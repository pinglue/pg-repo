
import {
    _merge,
    _mergeArr,
    _mergeClean,
    _mergeArrClean
} from "../lib/object-utils/index.js";

const funcs = [_merge, _mergeArr, _mergeClean, _mergeArrClean];

let target, obj, ans;

describe("1d objects - overwriting a single field", () => {
    
    beforeEach(() => {
        target = {
            field1: "field1",
            field2: 123,
            field3: false
        }
    
        obj = {
            field1: "field2",
            field2: 123,
        }

        ans = undefined;
    });

    test("Reg merge", () => {
        ans = _merge(target, obj);
        expect(ans).toEqual({
            field1: "field2",
            field2: 123,
            field3: false
        });
    });

    test("Arr merge", () => {
        ans = _mergeArr(target, obj);
        expect(ans).toEqual({
            field1: "field2",
            field2: 123,
            field3: false
        });
    });

    test("Clean merge", () => {
        expect(() => {
            _mergeClean(target, obj)
        }).toThrow("err-field-overwriting");
    });

    test("Arr clean merge", () => {
        expect(() => {
            _mergeArrClean(target, obj)
        }).toThrow("err-field-overwriting");
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
            field8: ["1", "two"],
        }
    
        obj = {
            field1: "field2",
            field2: null,
            field3: undefined,
            field6: ["a", {t:1}],
            field8: undefined
        }
    });

    test("Reg merge", () => {
        ans = _merge(target, obj);
        expect(ans).toEqual({
            field1: "field2",
            field2: null,
            field3: false,
            field4: null,
            field5: undefined,
            field6: ["a", {t:1}],
            field7: 7,
            field8: ["1", "two"]
        });
    });

    test("Arr merge", () => {
        ans = _mergeArr(target, obj);
        expect(ans).toEqual({
            field1: "field2",
            field2: null,
            field3: false,
            field4: null,
            field5: undefined,
            field6: ["field6", "a", {t:1}],
            field7: 7,
            field8: ["1", "two"]
        });
    });

    test("Clean merge", () => {
        expect(() => {
            _mergeClean(target, obj)
        }).toThrow("err-field-overwriting");
    });

    test("Arr clean merge", () => {
        expect(() => {
            _mergeArrClean(target, obj)
        }).toThrow("err-field-overwriting");
    });

});

describe('Nested - overwriting', () => {

    beforeEach(() => {
        target = {
            admin: true,
            config1: null,
            config2: {h:3},
            config3: {h:3},
            arrField: ["hey"],
            author: {
              name: { first: 'Joe' }
            }
          }
    
        obj = {
            admin: false,
            config1: {a: {t:1}},
            config2: null,
            config3: undefined,
            arrField: ["hey1"],
            author: {
              name: { last: 'Smith' },
              username: 'joesmith'
            }
          };
    });

    test("Reg merge", () => {
        ans = _merge(target, obj);
        expect(ans).toEqual({
            admin: false,
            config1: {a: {t:1}},
            config2: null,
            config3: {h:3},
            arrField: [ 'hey1' ],
            author: {
                name: { first: 'Joe', last: 'Smith' }, 
                username: 'joesmith' 
            }
        });
    });

    test("Arr merge", () => {
        ans = _mergeArr(target, obj);
        expect(ans).toEqual({
            admin: false,
            config1: {a: {t:1}},
            config2: null,
            config3: {h:3},
            arrField: [ "hey", 'hey1' ],
            author: {
                name: { first: 'Joe', last: 'Smith' }, 
                username: 'joesmith' 
            }
        });
    });

    test("Clean merge", () => {
        expect(() => {
            _mergeClean(target, obj)
        }).toThrow("err-field-overwriting");
    });

    test("Arr clean merge", () => {
        expect(() => {
            _mergeArrClean(target, obj)
        }).toThrow("err-field-overwriting");
    });
    
});

describe('Merge into empty object (deep cloning)', () => {

    beforeEach(() => {
        target = {}
    
        obj = {
            admin: false,
            config1: {a: {t:1}},
            config2: null,
            config3: undefined,
            arrField: ["hey1"],
            author: {
              name: { last: 'Smith' },
              username: 'joesmith'
            }
          };
    });

    test("Reg merge", () => {
        const ans = _merge(target, obj);
        expect(target).toEqual(obj);        
        expect(ans).toBe(target);
        expect(ans).not.toBe(obj);        
    });

    test("Arr merge", () => {
        const ans = _merge(target, obj);
        expect(target).toEqual(obj);        
        expect(ans).toBe(target);
        expect(ans).not.toBe(obj);
    });

    test("Clean merge", () => {
        const ans = _merge(target, obj);
        expect(target).toEqual(obj);        
        expect(ans).toBe(target);
        expect(ans).not.toBe(obj);
    });

    test("Arr clean merge", () => {
        const ans = _merge(target, obj);
        expect(target).toEqual(obj);        
        expect(ans).toBe(target);
        expect(ans).not.toBe(obj);
    });
    
});

describe("Nested - no overwrite", () => {

    beforeEach(() => {
        target = {
            config2: {h:3},
            config3: 3,
            arrField: undefined,
            author: {
              name: { first: 'Joe', nested2: {t:1} }
            }
          }
    
        obj = {
            admin: false,
            config1: {a: {t:1}},
            config3: undefined,
            arrField: ["hey1"],
            author: {
              name: { last: 'Smith', nested2: {t2:[1,2,3], t3:{t3:2}} },
              username: 'joesmith'
            }
          };

        ans = {
            admin: false,
            config1: {a: {t:1}},
            config2: {h:3},
            config3: 3,
            arrField: ["hey1"],
            author: {
                name: {
                    first: 'Joe',
                    last: 'Smith', 
                    nested2: {
                        t:1,
                        t2:[1,2,3],
                        t3:{t3:2}
                    } 
                },
                username: 'joesmith'                
            }
        }
        
    });

    test("Reg merge", () => {
        
        expect(_merge(target, obj)).toEqual(ans);
    });

    test("Arr merge", () => {
        
        expect(_mergeArr(target, obj)).toEqual(ans);
    });

    test("Clean merge", () => {
        
        expect(_mergeClean(target, obj)).toEqual(ans);
    });

    test("Arr clean merge", () => {
        
        expect(_mergeArrClean(target, obj)).toEqual(ans);
    });

    
});

describe("Nested - overwrite only for array fields", () => {

    beforeEach(() => {
        target = {
            config2: {h:3},
            config3: 3,
            arrField: ["hey0"],
            author: {
              name: { first: 'Joe', nested2: {t:1, t2:[1,2,3]} }
            }
          }
    
        obj = {
            admin: false,
            config1: {a: {t:1}},
            config3: undefined,
            arrField: ["hey1", "hey2"],
            author: {
              name: { last: 'Smith', nested2: {t2:[4,5,6], t3:{t3:2}} },
              username: 'joesmith'
            }
          };        
    });

    test("Reg merge", () => {
        
        _merge(target, obj);

        expect(target).toEqual({
            admin: false,
            config1: {a: {t:1}},
            config2: {h:3},
            config3: 3,
            arrField: ["hey1", "hey2"],
            author: {
                name: {
                    first: 'Joe',
                    last: 'Smith', 
                    nested2: {
                        t:1,
                        t2:[4,5,6],
                        t3:{t3:2}
                    } 
                },
                username: 'joesmith'                
            }
        });
    });

    test("Arr merge", () => {

        _mergeArr(target, obj)
        
        expect(target).toEqual({
            admin: false,
            config1: {a: {t:1}},
            config2: {h:3},
            config3: 3,
            arrField: ["hey0", "hey1", "hey2"],
            author: {
                name: {
                    first: 'Joe',
                    last: 'Smith', 
                    nested2: {
                        t:1,
                        t2:[1,2,3,4,5,6],
                        t3:{t3:2}
                    } 
                },
                username: 'joesmith'                
            }
        });
    });

    test("Clean merge", () => {

        expect(() => {
            _mergeClean(target, obj)
        }).toThrow("err-field-overwriting");
        
    });

    test("Arr clean merge", () => {
        
        _mergeArrClean(target, obj);

        expect(target).toEqual({
            admin: false,
            config1: {a: {t:1}},
            config2: {h:3},
            config3: 3,
            arrField: ["hey0", "hey1", "hey2"],
            author: {
                name: {
                    first: 'Joe',
                    last: 'Smith', 
                    nested2: {
                        t:1,
                        t2:[1,2,3,4,5,6],
                        t3:{t3:2}
                    } 
                },
                username: 'joesmith'                
            }
        });
    });

    
});

describe("Merging two arrays", () => {

    beforeEach(() => {
        
        target = [1,"2",true]

        obj = [{t:1}, 2, "3", [1,"6"]];

        ans = [1,"2",true, {t:1}, 2, "3", [1,"6"]];

    });

    test("Reg merge", () => {
        expect(() => {
            _merge(target, obj)
        }).toThrow("err-merging-arrays-no-merge-options-set");
    });

    test("Arr merge", () => {
        expect(_mergeArr(target, obj)).toEqual(ans);
    });

    test("Clean merge", () => {
        expect(() => {
            _mergeClean(target, obj)
        }).toThrow("err-merging-arrays-no-merge-options-set");
    });

    test("Clean arr merge", () => {
        expect(_mergeArr(target, obj)).toEqual(ans);
    });
    
});

describe("Null/undefined params", () => {

    let x;

    

    beforeEach(() => {
        x = {
            admin: true,
            config1: null,
            config2: {h:3},
            config3: {h:3},
            arrField: ["hey"],
            author: {
              name: { first: 'Joe' }
            }
          }
    });

    test("Undefined target", () => {

        for(const f of funcs) {
            expect(() => {
                f(undefined, x)
            }).toThrow("err-empty-target");
        }       
        
    });

    test("Null target", () => {

        for(const f of funcs) {
            expect(() => {
                f(null, x)
            }).toThrow("err-empty-target");
        }       
        
    });

    test("Undefined obj", () => {

        for(const f of funcs) {
            expect(f(x,undefined)).toEqual(x);
        }       
        
    });

    test("Null obj", () => {

        for(const f of funcs) {
            expect(f(x,null)).toEqual(x);
        }       
        
    });

    test("Null party", () => {
        for(const f of funcs) {
            
            expect(() => {
                f(null, null)
            }).toThrow("err-empty-target");

            expect(() => {
                f(undefined, null)
            }).toThrow("err-empty-target");

            expect(() => {
                f(null, undefined)
            }).toThrow("err-empty-target");

            expect(() => {
                f(undefined, undefined)
            }).toThrow("err-empty-target");
        }   
    });
    
});

describe("Unmatched types (1d case)", () => {
    
    test("primitive/array -> obj", () => {

        for(const f of funcs) {

            expect(() => {
                f({t:3}, 1)
            }).toThrow("err-obj-not-objarr");

            expect(() => {
                f({t:3}, "1")
            }).toThrow("err-obj-not-objarr");

            expect(() => {
                f({t:3}, true)
            }).toThrow("err-obj-not-objarr");

            expect(() => {
                f({t:3}, [1,2,"3"])
            }).toThrow("err-merging-array-to-object");
        }       
        
    });

    test("Miscs types", () => {

        for(const f of funcs) {

            expect(() => {
                f(1, 2)
            }).toThrow("err-target-not-objarr");

            expect(() => {
                f(1, "2")
            }).toThrow("err-target-not-objarr");

            expect(() => {
                f(true, {t:4})
            }).toThrow("err-target-not-objarr");

            expect(() => {
                f(true, null)
            }).toThrow("err-target-not-objarr");

            expect(() => {
                f(true, undefined)
            }).toThrow("err-target-not-objarr");

            expect(() => {
                f([1,2], {t:4})
            }).toThrow("err-merging-object-to-array");
        }
    });


    

});
