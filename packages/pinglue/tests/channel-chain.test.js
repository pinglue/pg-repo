

import {Channel} from "../lib/hub/channel.js";

// data logs
let data = [];

// logs
let warnLogs = [];
let errorLogs = [];

// fake log
const log = {
    warn: (code, data)=>warnLogs.push({code, data}),
    error: (code, data)=>errorLogs.push({code, data})
};

// channel
const ch = new Channel("test", {__log:log, syncType:"both"});

// wait
const waitt = async ()=>{await new Promise((res,rej)=>{setTimeout(()=>res(),100)})};

beforeEach(() => {
    data = [];
    warnLogs = [];
    errorLogs = [];
    ch.clear();
    ch.mergeSettings({reducer: "object-merge"});
});

test("No overlapping handler vals ", async () => {

    ch.glue("dummy-pl", (params, value)=>({
        a: true,
        arr: [1,2],
        b: {
            c:2,
            d: {e:[1,2]}
        }
    }));

    ch.glue("dummy-pl", (params, value)=>({
        a2: true,
        arr: [1,2],
        b: {
            c2:3
        }
    }));

    ch.glue("dummy-pl", (params, value)=>({
        d:5,
        b: {d: {e: [4,5]}}
    }));

    const params = {p:{q:1}};
    
    let value = {
        a: false,
        special: 1,
        arr: [1,2]
    };    

    const ansS = ch.runS("runner-pl", params, value);

    expect(ansS).toEqual({
        a: true,
        a2: true,
        special: 1,
        d:5,
        arr: [1,2,1,2,1,2],
        b: {
            c:2,
            c2:3,
            d: {e:[1,2,4,5]}
        }
    });

    // reflection
    expect(ansS).toBe(value);

    // no effect on params    
    expect(params).toEqual({p:{q:1}});
    /*expect(value).toEqual({
        a: false,
        special: 1,
        arr: [1,2]
    });*/

    // no freeze
    expect(Object.isFrozen(ansS)).toBe(false);
    expect(Object.isFrozen(ansS.arr)).toBe(false);
    expect(Object.isFrozen(ansS.b)).toBe(false);
    expect(Object.isFrozen(ansS.b.d)).toBe(false);




    value = {
        a: false,
        special: 1,
        arr: [1,2]
    };

    const ansA = await ch.runA("runner-pl", null, value);

    expect(ansA).toEqual({
        a: true,
        a2: true,
        special: 1,
        d:5,
        arr: [1,2,1,2,1,2],
        b: {
            c:2,
            c2:3,
            d: {e:[1,2,4,5]}
        }
    });

    // reflection
    expect(ansA).toBe(value);

    // no effect    
    expect(params).toEqual({p:{q:1}});

    // no freeze
    expect(Object.isFrozen(ansA)).toBe(false);
    expect(Object.isFrozen(ansA.arr)).toBe(false);
    expect(Object.isFrozen(ansA.b)).toBe(false);
    expect(Object.isFrozen(ansA.b.d)).toBe(false);
    
});


test("Overlapping handler vals ", async () => {

    ch.glue("dummy-pl1", (params, value)=>({
        a: true,
        arr: [1,2],
        b: {
            c:2,
            d: {e:[1,2]}
        }
    }));

    ch.glue("dummy-pl2", (params, value)=>({
        a: true,
        arr: [1,2],
        b: {
            c2:3
        }
    }));

    ch.glue("dummy-pl3", (params, value)=>({
        d:5,
        b: {d: {e: [4,5]}}
    }));

    const ansS = ch.runS("runner-pl", null, {
        a: false,
        special: 1,
        arr: [1,2]
    });

    expect(ansS).toBeUndefined();

    // checking the error message
    expect(errorLogs).toHaveLength(1);

    expect(errorLogs[0]).toMatchObject({
        code: "err-chan-reducer-obj-merge-failed",
        data: {
            controllerId: 'dummy-pl2',
            error: {
                code: 'err-field-overwriting',
                data: {
                    objectPath: '.a', 
                    oldValue: true, 
                    newValue: true 
                }
            }
        }
    });


    const ansA = await ch.runA("runner-pl", null, {
        a: false,
        special: 1,
        arr: [1,2]
    });

    expect(ansA).toBeUndefined();

    // checking the error message
    expect(errorLogs).toHaveLength(2);

    expect(errorLogs[1]).toMatchObject({
        code: "err-chan-reducer-obj-merge-failed",
        data: {
            controllerId: 'dummy-pl2',
            error: {
                code: 'err-field-overwriting',
                data: {
                    objectPath: '.a', 
                    oldValue: true, 
                    newValue: true 
                }
            }
        }
    });

    //errorLogs.forEach(item=>console.log(item));

});




test("Handler returns invalid values ", async () => {

    ch.glue("dummy-pl1", (params, value)=>({
        a: true,
        arr: [1,2],
        b: {
            c:2,
            d: {e:[1,2]}
        }
    }));

    ch.glue("dummy-pl2", (params, value)=>2);

    ch.glue("dummy-pl3", (params, value)=>({
        d:5,
        b: {d: {e: [4,5]}}
    }));

    const ansS = ch.runS("runner-pl", null, {
        a: false,
        special: 1,
        arr: [1,2]
    });

    expect(ansS).toBeUndefined();

    // checking the error message
    expect(errorLogs).toHaveLength(1);

    expect(errorLogs[0]).toMatchObject({
        code: "err-chan-reducer-obj-merge-failed",
        data: {
            controllerId: 'dummy-pl2',
            error: {
                code: 'err-obj-not-objarr',
                data: {
                    objectPath: ''
                }
            }
        }
    });

    const ansA = await ch.runA("runner-pl", null, {
        a: false,
        special: 1,
        arr: [1,2]
    });

    expect(ansA).toBeUndefined();

    // checking the error message
    expect(errorLogs).toHaveLength(2);

    expect(errorLogs[1]).toMatchObject({
        code: "err-chan-reducer-obj-merge-failed",
        data: {
            controllerId: 'dummy-pl2',
            error: {
                code: 'err-obj-not-objarr',
                data: {
                    objectPath: ''
                }
            }
        }
    });

});


test("Handler returns null ", async () => {

    ch.glue("dummy-pl1", (params, value)=>({
        a: true,
        arr: [1,2],
        b: {
            c:2,
            d: {e:[1,2]}
        }
    }));

    ch.glue("dummy-pl2", (params, value)=>null);

    ch.glue("dummy-pl3", (params, value)=>({
        d:5,
        b: {d: {e: [4,5]}}
    }));

    const ansS = ch.runS("runner-pl", null, {
        a: false,
        special: 1,
        arr: [1,2]
    });

    expect(ansS).toEqual({
        a: true,
        special: 1,
        arr: [1,2,1,2],
        b: {
            c:2,
            d: {e:[1,2,4,5]}
        },
        d:5
    });

    // checking the error message
    expect(errorLogs).toHaveLength(0);

    const ansA = await ch.runA("runner-pl", null, {
        a: false,
        special: 1,
        arr: [1,2]
    });

    expect(ansA).toEqual({
        a: true,
        special: 1,
        arr: [1,2,1,2],
        b: {
            c:2,
            d: {e:[1,2,4,5]}
        },
        d:5
    });

    // checking the error message
    expect(errorLogs).toHaveLength(0);
});



test("Empty init value ", async () => {

    ch.glue("dummy-pl1", (params, value)=>({
        a: true,
        arr: [1,2],
        b: {
            c:2,
            d: {e:[1,2]}
        }
    }));

    ch.glue("dummy-pl2", (params, value)=>null);

    ch.glue("dummy-pl3", (params, value)=>({
        d:5,
        b: {d: {e: [4,5]}}
    }));

    
    let ansS = ch.runS("runner-pl", null, null);
    expect(ansS).toEqual({
        a: true,        
        arr: [1,2],
        b: {
            c:2,
            d: {e:[1,2,4,5]}
        },
        d:5
    });
    expect(warnLogs).toHaveLength(1);    
    expect(errorLogs).toHaveLength(0);

    ansS = ch.runS("runner-pl", null);
    expect(ansS).toEqual({
        a: true,        
        arr: [1,2],
        b: {
            c:2,
            d: {e:[1,2,4,5]}
        },
        d:5
    });
    expect(warnLogs).toHaveLength(1);    
    expect(errorLogs).toHaveLength(0);

    let ansA = await ch.runA("runner-pl", null, null);
    expect(ansS).toEqual({
        a: true,        
        arr: [1,2],
        b: {
            c:2,
            d: {e:[1,2,4,5]}
        },
        d:5
    });
    expect(warnLogs).toHaveLength(2);    
    expect(errorLogs).toHaveLength(0);

    ansA = await ch.runA("runner-pl", null, undefined);
    expect(ansS).toEqual({
        a: true,        
        arr: [1,2],
        b: {
            c:2,
            d: {e:[1,2,4,5]}
        },
        d:5
    });
    expect(warnLogs).toHaveLength(2);    
    expect(errorLogs).toHaveLength(0);

});

test("Empty channel", async () => {

    const value = {a:{b:1}};
    
    // reflection
    let ans = ch.runS("runner-pl", {}, value);        
    expect(ans).toBe(value);

    // empty/invalid value defaults to {}
    ans = ch.runS("runner-pl", {}, null);
    expect(ans).toEqual({});
    ans = ch.runS("runner-pl", {});
    expect(ans).toEqual({});
    ans = ch.runS("runner-pl", {}, 10);
    expect(ans).toEqual({});  


    ans = await ch.runA("runner-pl", {}, value);        

    // reflection
    expect(ans).toBe(value);

    // empty/invalid value defaults to {}
    ans = await ch.runA("runner-pl", {}, null);
    expect(ans).toEqual({});
    ans = await ch.runA("runner-pl", {});
    expect(ans).toEqual({});
    ans = await ch.runA("runner-pl", {}, 10);
    expect(ans).toEqual({});

});

test("Handlers return array - merging lists", async () => {

    ch.glue("dummy-pl1", (params, value)=>([
        1,2,3
    ]));

    ch.glue("dummy-pl2", (params, value)=>([
        4,5
    ]));

    ch.glue("dummy-pl3", (params, value)=>([
        6
    ]));
   
    let ans = ch.runS("runner-pl", {}, [0]);        
    expect(ans).toEqual([0,1,2,3,4,5,6]);

    ans = await ch.runA("runner-pl", {}, [0]);        
    expect(ans).toEqual([0,1,2,3,4,5,6]);

});
