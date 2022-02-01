
import jest from "jest-mock";

import {Channel} from "../lib/hub/channel.js";

// data logs
let data = [];

// logs
let warnLogs = [];
let errorLogs = [];

// fake log
const log = {
    warn: msg=>warnLogs.push(msg),
    error: msg=>errorLogs.push(msg)
};

// channel
const ch = new Channel("test", {__log:log, syncType:"both"});

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


ch.mergeSettings({reducer});

// sync callbacks used for this test
let cbSync;
let faultySync;

// async callbacks used for this test
let cbAsync;
let faultyAsync;

// wait
const waitt = async ()=>{await new Promise((res,rej)=>{setTimeout(()=>res(),100)})};

beforeEach(() => {
    data = [];
    warnLogs = [];
    errorLogs = [];
    ch.clear();
    ch.mergeSettings({runMode:"chain", reducer});

    cbSync = [1,2,3,4,5].map(index=>jest.fn((params, value)=>{
        data.push(index);
        return index;
    }));

    cbAsync = [1,2,3,4,5].map(index=>jest.fn(async (params, value)=>{
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


test("Single sync cb", () => {
    
    const glueRes = ch.glue("dummy-pl", cbSync[0]);

    expect(glueRes).toBe(true);

    const ans = ch.runS("runner-pl", {p1:"p1"}, 3);

    expect(cbSync[0].mock.calls.length).toBe(1);
    expect(cbSync[0].mock.calls[0][0]).toEqual({p1:"p1"});
    expect(cbSync[0].mock.calls[0][2]).toEqual({runner:"runner-pl"});
    expect(cbSync[0].mock.calls[0][1]).toBe(3);

    expect(data).toEqual([1]);

    expect(ans).toBe(4);

    expect(warnLogs.length).toBe(0);
    expect(errorLogs.length).toBe(0);
});

test("Chained 5 sync handlers", () => {
    cbSync.forEach(cb=>ch.glue("dummy-pl", cb));
    const ans = ch.runS("runner-pl", {p1:"p1"}, 3);

    cbSync.forEach((cb, index)=>{
        expect(cb.mock.calls.length).toBe(1);
        expect(cb.mock.calls[0][0]).toEqual({p1:"p1"});
        expect(cb.mock.calls[0][2]).toEqual({runner:"runner-pl"});        
        expect(data).toContain(index+1);
    });

    expect(ans).toBe(18);
    expect(warnLogs.length).toBe(0);
    expect(errorLogs.length).toBe(0);
});

test("Chained sync handler with ct removal", () => {
    cbSync.forEach((cb,i)=>ch.glue(`dummy-pl${i%2}`, cb));

    ch.removeController("dummy-pl0");

    const ans = ch.runS("runner-pl", {p1:"p1"}, 3);

    cbSync.forEach((cb, index)=>{
        expect(cb.mock.calls.length).toBe(index%2);           
        if (index%2)
            expect(data).toContain(index+1);
        else
            expect(data).not.toContain(index+1);
    });

    expect(ans).toBe(9);
    expect(warnLogs.length).toBe(0);
    expect(errorLogs.length).toBe(0);
});

test("Single async cb", async () => {
    ch.glue("dummy-pl", cbAsync[0]);
    const ans = await ch.runA("runner-pl", {p1:"p1"}, 3);

    expect(cbAsync[0].mock.calls.length).toBe(1);
    expect(cbAsync[0].mock.calls[0][0]).toEqual({p1:"p1"});
    expect(cbAsync[0].mock.calls[0][2]).toEqual({runner:"runner-pl"});
    expect(cbAsync[0].mock.calls[0][1]).toBe(3);
    expect(data).toEqual([1]);
    expect(ans).toBe(4);
    expect(warnLogs.length).toBe(0);
    expect(errorLogs.length).toBe(0);
});

test("Chained 5 async handlers", async () => {
    cbAsync.forEach(cb=>ch.glue("dummy-pl", cb));
    const ans = await ch.runA("runner-pl", {p1:"p1"}, 3);

    cbAsync.forEach((cb, index)=>{
        expect(cb.mock.calls.length).toBe(1);
        expect(cb.mock.calls[0][0]).toEqual({p1:"p1"});
        expect(cb.mock.calls[0][2]).toEqual({runner:"runner-pl"});        
        expect(data).toContain(index+1);
    });

    expect(ans).toBe(18);
    expect(warnLogs.length).toBe(0);
    expect(errorLogs.length).toBe(0);
});

test("Chained 5 async handlers with ct removal", async () => {
    cbAsync.forEach((cb,i)=>ch.glue(`dummy-pl${i%2}`, cb));
    ch.removeController("dummy-pl0");
    const ans = await ch.runA("runner-pl", {p1:"p1"}, 3);

    cbAsync.forEach((cb, index)=>{
        expect(cb.mock.calls.length).toBe(index%2);           
        if (index%2)
            expect(data).toContain(index+1);
        else
            expect(data).not.toContain(index+1);
    });

    expect(ans).toBe(9);
    expect(warnLogs.length).toBe(0);
    expect(errorLogs.length).toBe(0);
});

test("no-value 5 async handlers", async () => {

    ch.mergeSettings({runMode:"no-value"});

    cbAsync.forEach(cb=>ch.glue("dummy-pl", cb));
    const ans = await ch.runA("runner-pl", {p1:"p1"}, 3);

    cbAsync.forEach((cb, index)=>{
        expect(cb.mock.calls.length).toBe(1);
        expect(cb.mock.calls[0][0]).toEqual({p1:"p1"});
        expect(cb.mock.calls[0][2]).toEqual({runner:"runner-pl"});
        expect(cb.mock.calls[0][1]).toBeUndefined();        
        expect(data).toContain(index+1);
    });

    expect(ans).toBeUndefined();
    expect(warnLogs.length).toBe(0);
    expect(errorLogs.length).toBe(0);
});

test("Warning on double glue for sync", () => {
    cbSync.forEach(cb=>{
        ch.glue("dummy-pl", cb);
        ch.glue("dummy-pl", cb);
    });

    const ans = ch.runS("runner-pl", {p1:"p1"}, 3);

    cbSync.forEach((cb, index)=>{
        expect(cb.mock.calls.length).toBe(1);
        expect(cb.mock.calls[0][0]).toEqual({p1:"p1"});
        expect(cb.mock.calls[0][2]).toEqual({runner:"runner-pl"});        
        expect(data).toContain(index+1);
    });

    expect(ans).toBe(18);
    expect(warnLogs.length).toBe(5);
    expect(errorLogs.length).toBe(0);
});

test("Warning on double glue for async", async () => {
    cbAsync.forEach(cb=>{
        ch.glue("dummy-pl", cb);
        ch.glue("dummy-pl", cb);
    });
    const ans = await ch.runA("runner-pl", {p1:"p1"}, 3);

    cbAsync.forEach((cb, index)=>{
        expect(cb.mock.calls.length).toBe(1);
        expect(cb.mock.calls[0][0]).toEqual({p1:"p1"});
        expect(cb.mock.calls[0][2]).toEqual({runner:"runner-pl"});        
        expect(data).toContain(index+1);
    });

    expect(ans).toBe(18);
    expect(warnLogs.length).toBe(5);
    expect(errorLogs.length).toBe(0); 
});

test("Unglue and double unglue in sync channel", () => {
    cbSync.forEach(cb=>ch.glue("dummy-pl", cb));

    ch.unglue("dummy-pl", cbSync[2]);
    ch.unglue("dummy-pl", cbSync[2]);
    ch.unglue("dummy-pl", cbSync[2]);

    const ans = ch.runS("runner-pl", {p1:"p1"}, 3);

    cbSync.forEach((cb, index)=>{
        if (index !== 2) {
            expect(cb.mock.calls.length).toBe(1);
            expect(cb.mock.calls[0][0]).toEqual({p1:"p1"});
            expect(cb.mock.calls[0][2]).toEqual({runner:"runner-pl"});        
            expect(data).toContain(index+1);
        }
        else {
            expect(cb.mock.calls.length).toBe(0);            
        }
    });

    expect(ans).toBe(15);
    expect(warnLogs.length).toBe(2);
    expect(errorLogs.length).toBe(0);
});

test("Unglue and double unglue in async channel", async () => {
    cbAsync.forEach(cb=>ch.glue("dummy-pl", cb));

    ch.unglue("dummy-pl", cbAsync[2]);
    ch.unglue("dummy-pl", cbAsync[2]);
    ch.unglue("dummy-pl", cbAsync[2]);    

    const ans = await ch.runA("runner-pl", {p1:"p1"}, 3);

    cbAsync.forEach((cb, index)=>{
        if (index !== 2) {
            expect(cb.mock.calls.length).toBe(1);
            expect(cb.mock.calls[0][0]).toEqual({p1:"p1"});
            expect(cb.mock.calls[0][2]).toEqual({runner:"runner-pl"});        
            expect(data).toContain(index+1);
        }
        else {
            expect(cb.mock.calls.length).toBe(0);            
        }
    });

    expect(ans).toBe(15);
    expect(warnLogs.length).toBe(2);
    expect(errorLogs.length).toBe(0);
});

test("Having async in a sync channel: warning and ignoring", () => {

    // adding an async listener
    ch.glue("dummy-pl", cbAsync[0]);    

    for(let i=1;i<=3; i++) 
        ch.glue("dummy-pl", cbSync[i]);

    // adding an async listener
    ch.glue("dummy-pl", cbAsync[4]);

    const ans = ch.runS("runner-pl", {p1:"p1"}, 3);

    for(let i=1;i<=5; i++)
        expect(data).toContain(i);

    expect(ans).toBe(12);
    expect(warnLogs.length).toBe(2);
    expect(errorLogs.length).toBe(0);
});

test("Chained 5 async handlers and 5 sync handlers in an async channel", async () => {

    cbSync.forEach(cb=>ch.glue("dummy-pl", cb));
    cbAsync.forEach(cb=>ch.glue("dummy-pl", cb));

    const ans = await ch.runA("runner-pl", {p1:"p1"}, 3);

    cbAsync.forEach((cb, index)=>{
        expect(cb.mock.calls.length).toBe(1);
        expect(cb.mock.calls[0][0]).toEqual({p1:"p1"});
        expect(cb.mock.calls[0][2]).toEqual({runner:"runner-pl"});        
        expect(data).toContain(index+1);
    });

    cbSync.forEach((cb, index)=>{
        expect(cb.mock.calls.length).toBe(1);
        expect(cb.mock.calls[0][0]).toEqual({p1:"p1"});
        expect(cb.mock.calls[0][2]).toEqual({runner:"runner-pl"});        
    });

    expect(ans).toBe(33);
    expect(warnLogs.length).toBe(0);
    expect(errorLogs.length).toBe(0);
});

test("Chained sync handlers with some faulty sync/async functions in sync channel", async () => {
    
    ch.glue("dummy-pl", cbSync[0]);
    ch.glue("dummy-pl2", faultyAsync[1]);
    ch.glue("dummy-pl", cbSync[2]);    
    ch.glue("dummy-pl3", faultySync[3]);
    ch.glue("dummy-pl", cbSync[4]);

    const ans = ch.runS("runner-pl", {p1:"p1"}, 3);
    await waitt();

    expect(faultyAsync[1].mock.calls.length).toBe(1);
    expect(faultySync[3].mock.calls.length).toBe(1);
    
    expect(data).toContain(1);
    expect(data).toContain("faulty2");
    expect(data).toContain(3);
    expect(data).toContain("faulty4");
    expect(data).toContain(5);    

    expect(ans).toBe(12);
    expect(warnLogs.length).toBe(1);
    expect(errorLogs.length).toBe(2);  
});




test("Chained async/sync handlers with some faulty sync/async functions in async channel", async () => {
    
    ch.glue("dummy-pl", cbAsync[0]);
    ch.glue("dummy-pl", faultyAsync[1]);
    ch.glue("dummy-pl", cbSync[2]);    
    ch.glue("dummy-pl", faultySync[3]);
    ch.glue("dummy-pl", cbAsync[4]);

    const ans = await ch.runA("runner-pl", {p1:"p1"}, 3);
    await waitt();

    expect(faultyAsync[1].mock.calls.length).toBe(1);
    expect(faultySync[3].mock.calls.length).toBe(1);

    
    expect(data).toContain(1);
    expect(data).toContain("faulty2");
    expect(data).toContain(3);
    expect(data).toContain("faulty4");
    expect(data).toContain(5);    

    expect(ans).toBe(12);
    expect(warnLogs.length).toBe(0);    
    expect(errorLogs.length).toBe(2);
});


test("no-value async/sync handlers with some faulty sync/async functions in async channel", async () => {

    ch.mergeSettings({runMode:"no-value"});
    
    ch.glue("dummy-pl", cbAsync[0]);
    ch.glue("dummy-pl2", faultyAsync[1]);
    ch.glue("dummy-pl", cbSync[2]);    
    ch.glue("dummy-pl3", faultySync[3]);
    ch.glue("dummy-pl", cbAsync[4]);

    const ans = await ch.runA("runner-pl", {p1:"p1"}, 3);

    expect(faultyAsync[1].mock.calls.length).toBe(1);
    expect(faultySync[3].mock.calls.length).toBe(1);

    
    expect(data).toContain(1);
    expect(data).toContain("faulty2");
    expect(data).toContain(3);
    expect(data).toContain("faulty4");
    expect(data).toContain(5);    

    expect(ans).toBeUndefined();
    expect(warnLogs.length).toBe(0);
    expect(errorLogs.length).toBe(2);

});


test("RunS params and value are read only", async () => {
    
    ch.glue("dummy-pl", cbAsync[0]);
    ch.glue("dummy-pl", faultyAsync[1]);
    ch.glue("dummy-pl", cbSync[2]);
    
    // trying to change params, and should fail
    ch.glue("dummy-pl", (params, value)=>{

        params.newField = "ahha";
        return 10;
    });

    // trying to deep change params, and should fail
    ch.glue("dummy-pl", (params, value)=>{

        params.p2.p3 = "ahha";
        return 10;
    });
    
    ch.glue("dummy-pl", faultySync[3]);
    ch.glue("dummy-pl", cbAsync[4]);
    ch.glue("dummy-pl", cbSync[4]);

    // trying to change value, and should fail
    ch.glue("dummy-pl", (params, value)=>{

        value.newField = "ahha";
        return 10;
    });

    // trying to deep change value, and should fail
    ch.glue("dummy-pl", (params, value)=>{

        value.a.b = "ahha";
        return 10;
    });

    const params = {p1:"p1", p2:{p3:4}};
    const value = {a:{b:1}};

    const ans = ch.runS("runner-pl", params, value);
    await waitt();

    // params/value not changed
    expect(params).toEqual({p1:"p1", p2:{p3:4}});
    expect(value).toEqual({a:{b:1}});

    expect(faultyAsync[1].mock.calls.length).toBe(1);
    expect(faultySync[3].mock.calls.length).toBe(1);

    
    expect(data).toContain(1);
    expect(data).toContain("faulty2");
    expect(data).toContain(3);
    expect(data).toContain("faulty4");
    expect(data).toContain(5);    

    expect(ans).toBe(value);
    expect(warnLogs.length).toBe(3);    
    expect(errorLogs.length).toBe(6);
});


test("RunA params and value are read only", async () => {
    
    ch.glue("dummy-pl", cbAsync[0]);
    ch.glue("dummy-pl", faultyAsync[1]);
    ch.glue("dummy-pl", cbSync[2]);
    
    // trying to change params, and should fail
    ch.glue("dummy-pl", (params, value)=>{

        params.newField = "ahha";
        return 10;
    });

    // trying to deep change params, and should fail
    ch.glue("dummy-pl", (params, value)=>{

        params.p2.p3 = "ahha";
        return 10;
    });
    
    ch.glue("dummy-pl", faultySync[3]);
    ch.glue("dummy-pl", cbAsync[4]);

    // trying to change value, and should fail
    ch.glue("dummy-pl", (params, value)=>{

        value.newField = "ahha";
        return 10;
    });

    // trying to deep change value, and should fail
    ch.glue("dummy-pl", (params, value)=>{

        value.a.b = "ahha";
        return 10;
    });

    const params = {p1:"p1", p2:{p3:4}};
    const value = {a:{b:1}};

    const ans = await ch.runA("runner-pl", params, value);
    await waitt();

    // params/value not changed
    expect(params).toEqual({p1:"p1", p2:{p3:4}});
    expect(value).toEqual({a:{b:1}});

    expect(faultyAsync[1].mock.calls.length).toBe(1);
    expect(faultySync[3].mock.calls.length).toBe(1);

    
    expect(data).toContain(1);
    expect(data).toContain("faulty2");
    expect(data).toContain(3);
    expect(data).toContain("faulty4");
    expect(data).toContain(5);    

    expect(ans).toBe(value);    
    expect(warnLogs.length).toBe(0);    
    expect(errorLogs.length).toBe(6);
});
