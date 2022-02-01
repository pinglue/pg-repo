
import jest from "jest-mock";

import {ChannelManager} from "../lib/hub/channel-manager.js";

// data logs
let data = [];

// logs
let warnLogs = [];
let errorLogs = [];

// fake log
const log = Object.assign(
    (code, data) => {},
    {
        warn: msg=>warnLogs.push(msg),
        error: msg=>errorLogs.push(msg)
    }
);

// channel manager
const chm = new ChannelManager({__log:log});

// sync callbacks used for this test
let cbSync;
let faultySync;

// async callbacks used for this test
let cbAsync;
let faultyAsync;

// wait
const waitt = async ()=>{await new Promise((res,rej)=>{setTimeout(()=>res(),100)})};

// custom reducer
const reducer = (outputs, initValue) => {
    
    if (typeof initValue !== "number")
        return initValue;

    return outputs.reduce(
        (acc,output)=>{
            if (typeof output.value === "number")
                return (acc+output.value);
            else 
                return acc;
        }, initValue
    )
};


beforeEach(() => {
    data = [];
    warnLogs = [];
    errorLogs = [];
    chm.clear();

    chm.regChannel("chan1", "reg-pl1", {
        reducer,
        syncType: "both"
    });

    chm.regChannel("chan2", "reg-pl2");
    chm.chanSettings("chan2", "reg-pl2", {
        reducer
    });



    cbSync = [1,2,3,4,5].map(index=>jest.fn((params)=>{
        data.push(index);
        return index;
    }));

    cbAsync = [1,2,3,4,5].map(index=>jest.fn(async (params)=>{
        data.push(index);
        return new Promise((res, rej)=>{
            setTimeout(()=>res(index), 30+index);
        });    
    }));

    faultySync = [1,2,3,4,5].map(index=>jest.fn((params, value)=>{
        data.push(`faulty${index}`);
        throw "error";
    }));

    faultyAsync = [1,2,3,4,5].map(index=>jest.fn(async (params, value)=>{
        data.push(`faulty${index}`);

        return new Promise((res, rej)=>{
            setTimeout(()=>rej("error"), 30+index);
        });        
    }));

});


test("Running a sync and an async channel with mix listeners", async () => {   
    
    chm.glue("chan1", "dummy-pl", cbSync[0]);
    chm.glue("chan1", "dummy-pl", cbSync[0]);
    chm.glue("chan1", "dummy-pl", faultySync[0]);
    chm.glue("chan1", "dummy-pl", faultyAsync[0]);
    chm.glue("chan2", "dummy-pl", cbSync[1]);
    chm.glue("chan1", "dummy-pl", cbSync[2]);
    chm.glue("chan1", "dummy-pl", cbAsync[3]);
    chm.glue("chan2", "dummy-pl", cbAsync[4]);
    chm.glue("chan2", "dummy-pl", faultySync[1]);
    chm.glue("chan2", "dummy-pl", faultyAsync[1]);

    // chan 1 sync
    let ans = chm.runS("chan1", "runner-pl", {p1:"item1"}, 3);

    let tt = await waitt();

    expect(ans).toBe(7);
    expect(warnLogs.length).toBe(3);    
    expect(errorLogs.length).toBe(2);
    expect(data.length).toBe(5);

    for(let i of [0,2]) {       
        expect(cbSync[i].mock.calls[0][0]).toEqual({p1:"item1"});

        expect(cbSync[i].mock.calls[0][2]).toEqual({ runner:"runner-pl"});
    }

    
    expect(cbAsync[3].mock.calls[0][0]).toEqual({p1:"item1"});
    expect(cbAsync[3].mock.calls[0][2]).toEqual({runner:"runner-pl"});

    // chan 2 async

    

    data = [];
    warnLogs = [];
    errorLogs = [];
    ans = await chm.runA("chan2", "runner-pl", {p1:"item1"}, 3);
    
    expect(ans).toBe(10);
    expect(warnLogs.length).toBe(0);    
    expect(errorLogs.length).toBe(2);
    expect(data.length).toBe(4);
    expect(cbSync[1].mock.calls[0][0]).toEqual({p1:"item1"});
    expect(cbSync[1].mock.calls[0][2]).toEqual({runner:"runner-pl"});
    expect(cbAsync[4].mock.calls[0][0]).toEqual({p1:"item1"});
    expect(cbAsync[4].mock.calls[0][2]).toEqual({runner:"runner-pl"});
});


test("Running a no-value channel in sync and async with mix listeners", async () => {

    chm.chanSettings("chan1", "reg-pl1", {
        runMode: "no-value"
    });
    
    chm.glue("chan1", "dummy-pl", cbSync[0]);
    chm.glue("chan1", "dummy-pl", cbSync[0]);
    chm.glue("chan1", "dummy-pl", faultySync[0]);
    chm.glue("chan1", "dummy-pl", faultyAsync[0]);
    chm.glue("chan2", "dummy-pl", cbSync[1]);
    chm.glue("chan1", "dummy-pl", cbSync[2]);
    chm.glue("chan1", "dummy-pl", cbAsync[3]);
    chm.glue("chan2", "dummy-pl", cbAsync[4]);
    chm.glue("chan2", "dummy-pl", faultySync[1]);
    chm.glue("chan2", "dummy-pl", faultyAsync[1]);

    // chan 1 sync
    let ans = chm.runS("chan1", "runner-pl", {p1:"item1"}, 3);

    await waitt();

    expect(ans).toBeUndefined();
    expect(warnLogs).toHaveLength(3);    
    expect(errorLogs).toHaveLength(2);
    expect(data.length).toBe(5);

    chm.chanSettings("chan2", "reg-pl2", {
        runMode: "no-value"
    });

    data = [];
    warnLogs = [];
    errorLogs = [];
    ans = await chm.runA("chan2", "runner-pl", {p1:"item1"}, 3);
    
    expect(ans).toBeUndefined();
    expect(warnLogs.length).toBe(0);    
    expect(errorLogs.length).toBe(2);
    expect(data.length).toBe(4);
    expect(cbSync[1].mock.calls[0][0]).toEqual({p1:"item1"});
    expect(cbSync[1].mock.calls[0][2]).toEqual({runner:"runner-pl"});
    expect(cbAsync[4].mock.calls[0][0]).toEqual({p1:"item1"});
    expect(cbAsync[4].mock.calls[0][2]).toEqual({runner:"runner-pl"});

});

test("Sync type", async () => {

    chm.chanSettings("chan1", "reg-pl1", {
        syncType: "sync"
    });
    
    chm.glue("chan1", "dummy-pl", cbSync[0]);
    chm.glue("chan1", "dummy-pl", cbSync[0]);
    chm.glue("chan1", "dummy-pl", faultySync[0]);
    chm.glue("chan1", "dummy-pl", faultyAsync[0]);
    chm.glue("chan2", "dummy-pl", cbSync[1]);
    chm.glue("chan1", "dummy-pl", cbSync[2]);
    chm.glue("chan1", "dummy-pl", cbAsync[3]);
    chm.glue("chan2", "dummy-pl", cbAsync[4]);
    chm.glue("chan2", "dummy-pl", faultySync[1]);
    chm.glue("chan2", "dummy-pl", faultyAsync[1]);

    // chan 1 sync
    // No way to test error in an async function!!!!!!
    let err = false;

    try {
        await chm.runA("chan1", "runner-pl", {p1:"item1"}, 3)
    }
    catch(error) {err=true}

    expect(err).toBe(true);
   
    await waitt();

    expect(errorLogs).toHaveLength(1);

   // chan 2 

    chm.chanSettings("chan2", "reg-pl2", {
        syncType: "async"
    });

    data = [];
    warnLogs = [];
    errorLogs = [];

    expect(() => {
        chm.runS("chan2", "runner-pl", {p1:"item1"}, 3);    
    }).toThrow();

    expect(errorLogs).toHaveLength(1);
    
});


test("Single handler channel", async () => {

    chm.chanSettings("chan1", "reg-pl1", {
        singleHandler: true
    });
    
    chm.glue("chan1", "dummy-pl", cbSync[0]);

    expect(() => {
        chm.glue("chan1", "dummy-pl", cbSync[0]);    
    }).toThrow();

    expect(errorLogs).toHaveLength(1);

});

test("No-empty channel warning", async () => {

    chm.chanSettings("chan1", "reg-pl1", {
        noEmpty: true
    });
    
    chm.glue("chan1", "dummy-pl", cbSync[0]);

   
    chm.unglue("chan1", "dummy-pl", cbSync[0]);    
   

    expect(errorLogs).toHaveLength(0);
    expect(warnLogs).toHaveLength(1);

});



test("Running a sync and an async channel with mix listeners with ct removal", async () => {
    
    chm.glue("chan1", "dummy-pl", cbSync[0]);
    chm.glue("chan1", "dummy-pl2", cbSync[0]);
    chm.glue("chan1", "dummy-pl", faultySync[0]);
    chm.glue("chan1", "dummy-pl2", faultyAsync[0]);
    chm.glue("chan2", "dummy-pl", cbSync[1]);
    chm.glue("chan1", "dummy-pl2", cbSync[2]);
    chm.glue("chan1", "dummy-pl", cbAsync[3]);
    chm.glue("chan2", "dummy-pl2", cbAsync[4]);
    chm.glue("chan2", "dummy-pl", faultySync[1]);
    chm.glue("chan2", "dummy-pl2", faultyAsync[1]);

    chm.removeController("dummy-pl2");

    // chan 1 sync
    let ans = chm.runS("chan1", "runner-pl", {p1:"item1"}, 3);

    let tt = await waitt();

    expect(ans).toBe(4);
    expect(warnLogs.length).toBe(2);    
    expect(errorLogs.length).toBe(1);
    //expect(data.length).toBe(5);

    /*for(let i of [0,2]) {       
        expect(cbSync[i].mock.calls[0][0]).toEqual({p1:"item1"});

        expect(cbSync[i].mock.calls[0][2]).toEqual({ runner:"runner-pl"});
    }*/

    
    //expect(cbAsync[3].mock.calls[0][0]).toEqual({p1:"item1"});
    //expect(cbAsync[3].mock.calls[0][2]).toEqual({runner:"runner-pl"});

    // chan 2 async
    data = [];
    warnLogs = [];
    errorLogs = [];
    ans = await chm.runA("chan2", "runner-pl", {p1:"item1"}, 3);
    
    expect(ans).toBe(5);
    expect(warnLogs.length).toBe(0);    
    expect(errorLogs.length).toBe(1);
    /*expect(data.length).toBe(4);
    expect(cbSync[1].mock.calls[0][0]).toEqual({p1:"item1"});
    expect(cbSync[1].mock.calls[0][2]).toEqual({runner:"runner-pl"});
    expect(cbAsync[4].mock.calls[0][0]).toEqual({p1:"item1"});
    expect(cbAsync[4].mock.calls[0][2]).toEqual({runner:"runner-pl"});*/
});


