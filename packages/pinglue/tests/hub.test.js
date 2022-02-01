
/**
 * 
 * 2 channels:
 * - chan1: sync channel: each controller adds its index to the value (like controller[1] adds 1, controller[2] adds 2, etc.)
 * - chan2: async version of chan1, each controller does teh same thing after 10ms
 * 
 * an array of 5 controllers: controller[0..4]
 * each controller has two methods to test:
 * - runChan1Sync
 * - runChan1Async
 * - runChan2Sync
 * - runChan2Async
 */

import jest from "jest-mock";

import {Hub} from "../lib/hub/hub.js";
import {Controller} from "../lib/controller.js";


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



// wait
const waitt = async (t=30)=>{await new Promise((res,rej)=>{setTimeout(()=>res(),t)})};

// action output
const actions = [];

// logs collection
const LOG_TYPES = ["info", "success", "warn", "error", "security"];
const logs = {};
LOG_TYPES.forEach(type=>logs[type]=[]);

// log function to be used for the test
const log = msg=>logs["info"].push(msg);
LOG_TYPES.forEach(type=>log[type]=msg=>logs[type].push(msg));

let hub;
let regObject;

// controllers
const CtClass = [0,1,2,3,4].map(index=>{

    return class extends Controller {

        async init() {

            //this.log.info("Hey settings are", this.settings);

            this.actions = this.settings.actions;
    
            this.glue("chan1", this.chan1Listener.bind(this));
            this.glue("chan2", this.chan2Listener.bind(this));
            this.glue("chan3", this.chan3Listener.bind(this));
            this.glue("chan4", this.chan4Listener.bind(this));
        }

        getId() {
            return this.id;
        }
    
        chan1Listener(params, value) {
            actions.push({
                name: "chan1 listener",
                ct:index,
                params,
                value
            });
            if (typeof value === "number")
                return index;
            else return
        }

        async chan2Listener(params, value) {
            actions.push({
                name: "chan2 listener",
                ct:index,
                params,
                value
            });

            await waitt();

            if (typeof value === "number")
                return index;
            else return
        }

        chan3Listener(params, value) {
            actions.push({
                name: "chan3 listener",
                ct:index,
                params,
                value
            });
            if (index%2===0) return;
            
            if (typeof value === "number")
                return index;
            else return
        }

        async chan4Listener(params, value) {
            actions.push({
                name: "chan2 listener",
                ct:index,
                params,
                value
            });

            await waitt();

            if (index%2===0) return;

            if (typeof value === "number")
                return index;
            else return
        }

        runChan1Sync(params, value) {
            return this.runS("chan1", params, value);
        }
        
        async runChan1Async(params, value) {
            return this.runA("chan1", params, value);
        }
        
        runChan2Sync(params, value) {
            return this.runS("chan2", params, value);
        }
        
        async runChan2Async(params, value) {
            return this.runA("chan2", params, value);
        }        
    }
});

beforeEach(async () => {

    actions.splice(0, actions.length); 
    Object.keys(logs).forEach(type=>logs[type]=[]);

    // init hub
    hub = new Hub();
    regObject = hub.registerObject;
});


test("Controllers all glued in the init state one by one - testing runS runA", async () => {

    const controllers = [];

    // gluing the controllers
    for(let i=0; i<5; i++) {
        controllers.push(regObject.registerNew(`controller-${i}`, {actions}, CtClass[i]));
    }

    await hub.init();

    // registering channels
    hub.regChannel("chan1", {reducer, syncType:"both"});
    controllers[0].regChannel("chan2", {reducer, syncType:"both"});


    await hub.start();

    const params = {k1:"kk1", k2:"kk2"};

    const ans1 = controllers[0].runChan1Sync(params, 3);   

    //console.log("Actions", actions);
    //console.log("Logs", logs);

    expect(ans1).toBe(13);

    const ans2 = await controllers[0].runChan1Async(params, 3);
    expect(ans2).toBe(13);


    //actions.splice(0,actions.length);
    const ans3 = controllers[0].runChan2Sync(params, 3);
    //console.log(actions);
    expect(ans3).toBe(3);

    const ans4 = await controllers[0].runChan2Async(params, 3);
    expect(ans4).toBe(13);   
});


test("Controllers 0 and 1 glued in the init state, then hub starts and then the other two controllers will be added", async () => {

    const controllers = [0,1].map(i=>regObject.registerNew(`controller-${i}`, {actions}, CtClass[i]));

    await hub.init();
    
    // registering channels
    hub.regChannel("chan1", {syncType:"both"});
    hub.chanSettings("chan1", {reducer, syncType:"both"});

    await hub.start();

    const params = {k1:"kk1", k2:"kk2"};

    let ans = controllers[1].runChan1Sync(params, 4);
    expect(ans).toBe(5);
    ans = await controllers[0].runChan1Async(params, 4);
    expect(ans).toBe(5);

    // adding the other three controllers
    for(let i=2; i<5; i++) {
        controllers.push(await regObject.glueNew(`controller-${i}`, {actions}, CtClass[i]));
    }

    ans = await controllers[4].runChan1Async(params, 4);
    expect(ans).toBe(14);
});

test("Controllers 0,1,2 glued in the init state - ct 1 is removed - hub inits - ct 0 is removed - controllers 3,4 are added - controller 3 is removed", async () => {

    const params = {k1:"kk1", k2:"kk2"};

    const controllers = [0,1,2].map(i=>regObject.registerNew(`controller-${i}`, {actions}, CtClass[i]));

    controllers[1].cleanup();

    await hub.init();
    // registering channels
    controllers[0].regChannel("chan1", {syncType:"both"});
    controllers[0].chanSettings("chan1", {reducer, syncType:"both"});
    await hub.start();
    

    let ans = controllers[2].runChan1Sync(params, 4);
    expect(ans).toBe(6);
    ans = await controllers[2].runChan1Async(params, 4);
    expect(ans).toBe(6);

    controllers[0].cleanup();

    ans = controllers[2].runChan1Sync(params, 4);
    expect(ans).toBe(6);
    ans = await controllers[2].runChan1Async(params, 4);
    expect(ans).toBe(6);

    // adding the other controllers
    for(let i=3; i<5; i++) {
        const ct = await regObject.registerNew(`controller-${i}`, {actions}, CtClass[i]);
        await ct.initCallback();
        await ct.startCallback();
        controllers.push(ct);
    }

    ans = controllers[3].runChan1Sync(params, 4);
    expect(ans).toBe(13);
    ans = await controllers[3].runChan1Async(params, 4);
    expect(ans).toBe(13);  

    controllers[3].cleanup();

    ans = controllers[4].runChan1Sync(params, 4);
    expect(ans).toBe(10);
    ans = await controllers[4].runChan1Async(params, 4);
    expect(ans).toBe(10);

});

test("controller 1,2 -> sub controllers of controller 0 - hub starts - controller 3 with controller 4 as subcontroller", async () => {
    
    const ct0 = await regObject.registerNew(`controller-0`, {
        actions,
        __extensions:[
            {id:"sct1", ClassRef:CtClass[1], settings:{extra:1}},
            {id:"sct2", ClassRef:CtClass[2], settings:{extra:2}}
        ]
    }, CtClass[0]);

    await hub.init();
    // registering channels    
    hub.regChannel("chan1", {reducer, syncType:"both"});
    await hub.start();

    const params = {k1:"kk1", k2:"kk2"};

    let ans = ct0.runChan1Sync(params, 4);
    expect(ans).toBe(7);
    ans = await ct0.runChan1Async(params, 4);
    expect(ans).toBe(7);


    const ct3 = await regObject.glueNew(`controller-3`, {
        actions,
        __extensions:[
            {id:"sct4", ClassRef:CtClass[4], settings:{extra:4}}
        ]
    }, CtClass[3]);

    ans = ct3.runChan1Sync(params, 4);
    expect(ans).toBe(14);
    ans = await ct0.runChan1Async(params, 4);
    expect(ans).toBe(14);
});

test("Controller id duplicate registration", () => {

    const controllers = [];

    expect(()=>{
        for(let i=0; i<2; i++) {

            const ct = regObject.registerNew(`controller`, {actions}, CtClass[i]);

            expect(ct.getId()).toBe("controller");

            controllers.push(ct);
        }
    }).toThrow();

    for(let i=2; i<5; i++) {
        
        const ct = regObject.registerNew(`controller`, {
            actions,
            __flexId: true
        }, CtClass[i]);
    
        
        expect(ct.getId()).toBe(`(#${i})controller`);

        controllers.push(ct);
    }

    expect(controllers.length).toBe(4);
});


test("Run chain with undefined return", async () => {

    const controllers = [];

    // gluing the controllers
    for(let i=0; i<5; i++) {
        controllers.push(regObject.registerNew(`controller-${i}`, {actions}, CtClass[i]));
    }

    await hub.init();
    hub.regChannel("chan3", {reducer, syncType:"both"});
    hub.regChannel("chan4", {reducer, syncType:"both"});
    await hub.start();

    const params = {k1:"kk1", k2:"kk2"};
    
    let ans = controllers[0].runS("chan3", params, 4);
    expect(ans).toBe(8);

    ans = await controllers[0].runA("chan4", params, 4);
    expect(ans).toBe(8);


});

// TODO: make a copy of them in the channel.test
// Modify them by registering the channels
test("Run channels no-value", async () => {

    const controllers = [];

    // gluing the controllers
    for(let i=0; i<5; i++) {
        controllers.push(regObject.registerNew(`controller-${i}`, {actions}, CtClass[i]));
    }

    await hub.init();
    hub.regChannel("chan3", {reducer, runMode:"no-value", syncType:"both"});
    controllers[3].regChannel("chan4", {reducer, runMode: "no-value", syncType:"both"});
    await hub.start();

    const params = {k1:"kk1", k2:"kk2"};
    
    let ans = controllers[0].runS("chan3", params, 4);
    expect(ans).toBeUndefined();

    ans = await controllers[0].runA("chan4", params, 4);
    expect(ans).toBeUndefined();


});

test("Run with breakable chain", async () => {

    const controllers = [];

    // gluing the controllers
    for(let i=0; i<5; i++) {
        controllers.push(regObject.registerNew(`controller-${i}`, {actions}, CtClass[i]));
    }

    await hub.init();
    hub.regChannel("chan3", {reducer, runMode:"chain-breakable", syncType:"both"});
    controllers[3].regChannel("chan4", {reducer, runMode: "chain-breakable", syncType:"both"});
    await hub.start();

    let ans;

    const params = {k1:"kk1", k2:"kk2"};
    
    // custom reducer
    ans = controllers[0].runS("chan3", params, 4);
    expect(ans).toBe(5);
    ans = controllers[0].runS("chan3", params);
    expect(ans).toBeUndefined();

    // default reducer
    hub.chanSettings("chan3", {reducer:null});

    // handler value
    ans = controllers[0].runS("chan3", params, 4);
    expect(ans).toBe(1);
    // default (init) value
    ans = controllers[0].runS("chan3", params, {b:5});
    expect(ans).toEqual({b:5});
    // default (init) value
    ans = controllers[0].runS("chan3", params);
    expect(ans).toBeUndefined();


    ans = await controllers[0].runA("chan4", params, 4);
    expect(ans).toBe(5);
    ans = await controllers[0].runA("chan4", params);
    expect(ans).toBeUndefined();

    // default reducer
    controllers[3].chanSettings("chan4", {reducer:null});
    // handler value
    ans = await controllers[0].runA("chan4", params, 4);
    expect(ans).toBe(1);
    // default value
    ans = await controllers[0].runA("chan4", params, {});
    expect(ans).toEqual({});
    // default value
    ans = await controllers[0].runA("chan4", params);
    expect(ans).toBeUndefined()

});

test("Run with filtering (filter option)", async () => {

    const controllers = [];

    // gluing the controllers
    for(let i=0; i<5; i++) {
        controllers.push(regObject.registerNew(`controller-${i}`, {actions}, CtClass[i]));
    }

    await hub.init();
    controllers[0].regChannel("chan3", {reducer, syncType:"both"});
    controllers[0].regChannel("chan4", {reducer, syncType:"both"});
    await hub.start();

    const params = {k1:"kk1", k2:"kk2"};

    let ans;

    ans = controllers[1].runS("chan3", params, 4, {filter:"controller-3"});
    expect(ans).toBe(7);
    ans = controllers[1].runS("chan3", params, 4, {filter:"controller-2"});
    expect(ans).toBe(4);
    ans = controllers[1].runS("chan3", params, 4, {filter:["controller-3", "controller-2"]});
    expect(ans).toBe(7);
    ans = controllers[1].runS("chan3", params, 4, {filter:["controller-1", "controller-3", "controller-2"]});
    expect(ans).toBe(8);
    ans = controllers[1].runS("chan3", params, 4, {filter:[]});
    expect(ans).toBe(8);
    ans = controllers[1].runS("chan3", params, 4, {filter:""});
    expect(ans).toBe(8);


    ans = await controllers[2].runA("chan4", params, 4, {filter:"controller-3"});
    expect(ans).toBe(7);
    ans = await controllers[1].runA("chan4", params, 4, {filter:"controller-2"});
    expect(ans).toBe(4);
    ans = await controllers[1].runA("chan4", params, 4, {filter:["controller-3", "controller-2"]});
    expect(ans).toBe(7);
    ans = await controllers[1].runA("chan4", params, 4, {filter:["controller-1", "controller-3", "controller-2"]});
    expect(ans).toBe(8);
    ans = await controllers[2].runA("chan4", params, 4, {filter:[]});
    expect(ans).toBe(8);
    ans = await controllers[2].runA("chan4", params, 4, {filter:""});
    expect(ans).toBe(8);
    
});