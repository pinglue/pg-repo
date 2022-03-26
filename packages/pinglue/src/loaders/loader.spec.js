
import chai, {expect} from "chai";
import sinon from "sinon";
import sinonChai from "sinon-chai";
import {setTimeout} from 'timers/promises';
import {Subject} from "rxjs";

import EventEmitter from "events";

import {
    Loader, LoadEventType
} from "./loader.js";
import { Msg } from "@pinglue/utils";

const FILE_PATH = "this/that";
const PKG_NAME = "pinglue";
const FAKE_FS_DATA = index => ({a:index});
const FAKE_SL_DATA = index => ({a:index});

class FakeFsWatcher extends EventEmitter {
    constructor(index) {
        super();
        this.index = index;
        this.close = sinon.spy();
    }
    emitChange(filePath = FILE_PATH) {
        this.emit("all", "change", `${filePath}/${this.index}`);
    }    
}

let fsSources = [];
let subLoaderSources = [];

describe("loader", () => {

    chai.use(sinonChai);
    
    let loader;
    const sandbox = sinon.createSandbox();   

    function setup({
        watch = true,
        errorOnDataCHange,
        errorOnReduce
    }={}) {

        class FakeLoader extends Loader {

            init() {}
        
            onDataChange({
                source,
                dataChangeInfo
            }) {

                if (errorOnDataCHange) throw(errorOnDataCHange);
                
                // immitating reading from file system
                if (source.id.startsWith("fake-fs")) {
                    this.setSourceData(
                        source.id, FAKE_FS_DATA(source.meta.index)
                    );
                }
        
                return {
                    pkgName: PKG_NAME,
                    dataChangeInfo
                };
            }
        
            reduce() {
                if (errorOnReduce) throw(errorOnReduce);
                return [...this.sources.values()]
                    .map(info => info.dataSnapshot);
            }
        }       


        fsSources = [...new Array(5)]
            .map((_,i)=>({
                id: "fake-fs"+i,
                type: "fs",
                fsWatcher: new FakeFsWatcher(i),
                meta: {index:i}
            }));

        subLoaderSources = [...new Array(5)]
        .map((_,i)=>({
            id: "fake-sl"+i,
            type: "sub-loader",
            loader: {load$: new Subject(), close: sinon.spy()},
            meta: {index:i}
        })); 

        loader = new FakeLoader({watch});
        sandbox.spy(loader);
    }

    afterEach(() => {
        sandbox.restore();
    });

    describe("when adding a signle fs watcher", async () => {
        
        it("should make correct initial call to the onDataChange method", async () => {
            setup();

            loader.addFsSource(fsSources[0]);
            await setTimeout(1);
    
            expect(loader.onDataChange.callCount).to.equal(1);
            expect(loader.onDataChange.getCall(0).args[0].source).to.equal(fsSources[0]);
            expect(loader.onDataChange.getCall(0).args[0].dataChangeInfo).to.deep.equal({
                type: LoadEventType.INITIAL_LOAD
            });
        });
        
        it("should make correct initial call and return to the reduce method", async () => {
            setup();

            loader.addFsSource(fsSources[0]);    
            await setTimeout(1);

            expect(loader.reduce.callCount).to.equal(1);
            expect(loader.reduce.getCall(0).returned([
                FAKE_FS_DATA(0)
            ])).to.be.true;            
        });
    });

    describe("when adding a signle sub loader watcher", async () => {
        
        it("should make correct initial call to the onDataChange method", async () => {
            setup();
            loader.addSubLoaderSource(subLoaderSources[0]);

            subLoaderSources[0].loader.load$.next({
                dataChangeInfo: {
                    type: LoadEventType.INITIAL_LOAD,                    
                    pkgName: "pinglue"
                },
                data: FAKE_SL_DATA(0)
            });

            await setTimeout(5);

            expect(loader.onDataChange.callCount).to.equal(1);
            expect(loader.onDataChange.getCall(0).args[0].source).to.equal(subLoaderSources[0]);
            expect(loader.onDataChange.getCall(0).args[0].dataChangeInfo).to.deep.equal({
                type: LoadEventType.INITIAL_LOAD
            });
            expect(loader.getSourceData("fake-sl0")).to.deep.equal(
                FAKE_SL_DATA(0)
            );
        });

        it("should make correct initial call and return to the reduce method", async () => {
            setup();
            loader.addSubLoaderSource(subLoaderSources[0]);

            subLoaderSources[0].loader.load$.next({
                dataChangeInfo: {
                    type: LoadEventType.INITIAL_LOAD,                    
                    pkgName: "pinglue"
                },
                data: FAKE_SL_DATA(0)
            });

            await setTimeout(5);

            expect(loader.reduce.callCount).to.equal(1);
            expect(loader.reduce.getCall(0).returned([
                FAKE_SL_DATA(0)
            ])).to.be.true; 

        });

    });

    describe("when fs watcher emits a change - case of signle source", () => {

        it("should make correct call to onDataChange method when watch is on", async () => {        
            setup();
            loader.addFsSource(fsSources[0]);
            await setTimeout(1);
    
            fsSources[0].fsWatcher.emitChange();
    
            expect(loader.onDataChange.callCount).to.equal(2);
            expect(loader.onDataChange.getCall(-1).args[0].source).to.equal(fsSources[0]);
            expect(loader.onDataChange.getCall(-1).args[0].dataChangeInfo).to.deep.equal({
                type: LoadEventType.CHANGE,
                filePath: `${FILE_PATH}/0`
            });
        });

        it("should make a single call with correct args onDataChange method when watch is off", async () => {        
            setup({watch: false});
            loader.addFsSource(fsSources[0]);
            await setTimeout(1);
    
            fsSources[0].fsWatcher.emitChange();
    
            expect(loader.onDataChange.callCount).to.equal(1);

            expect(loader.onDataChange.getCall(0).args[0].source).to.equal(fsSources[0]);
            expect(loader.onDataChange.getCall(0).args[0].dataChangeInfo).to.deep.equal({
                type: LoadEventType.INITIAL_LOAD
            });
        });

        it("should make a single call with correct args onDataChange method when watch is on and fs source has no watcher", async () => {        
            setup({watch: false});

            const watcher = fsSources[0].fsWatcher
            delete fsSources[0].fsWatcher;

            loader.addFsSource(fsSources[0]);
            await setTimeout(1);
    
            watcher.emitChange();
    
            expect(loader.onDataChange.callCount).to.equal(1);

            expect(loader.onDataChange.getCall(0).args[0].source).to.equal(fsSources[0]);
            expect(loader.onDataChange.getCall(0).args[0].dataChangeInfo).to.deep.equal({
                type: LoadEventType.INITIAL_LOAD
            });
        });

        it("should make correct initial call and return to the reduce method when watch is on", async () => {
            setup();
            loader.addFsSource(fsSources[0]);
            await setTimeout(10);
            fsSources[0].fsWatcher.emitChange();
    
            await setTimeout(10);

            expect(loader.reduce.callCount).to.equal(2);
            expect(loader.reduce.getCall(0).returned([
                FAKE_FS_DATA(0)
            ])).to.be.true;
            expect(loader.reduce.getCall(1).returned([
                FAKE_FS_DATA(0)
            ])).to.be.true;            
        });
    });

    describe("testing the emitted values of the load$ for fs sources", () => {
        
        it("should emit correct initial value when adding a single fs source ", (done) => {
            setup();
            loader.load$.subscribe(event => {
                expect(event).to.deep.equal({
                    data: [FAKE_FS_DATA(0)],
                    dataChangeInfo: {type: LoadEventType.INITIAL_LOAD},
                    pkgName: PKG_NAME
                });
                done();
            });

            loader.addFsSource(fsSources[0]);
            
        });

        it("should emit correct values when adding a single fs source and it emits a change", async () => {
            setup();

            let c = 0;

            loader.load$.subscribe(event => {

                switch(++c) {
                    case 1: {
                        expect(event).to.deep.equal({
                            data: [FAKE_FS_DATA(0)],
                            dataChangeInfo: {type: LoadEventType.INITIAL_LOAD},
                            pkgName: PKG_NAME
                        });
                        break;
                    }

                    case 2: {
                        expect(event).to.deep.equal({
                            data: [FAKE_FS_DATA(0)],
                            dataChangeInfo: {
                                type: LoadEventType.CHANGE,
                                filePath: `${FILE_PATH}/0`
                            },
                            pkgName: PKG_NAME                            
                        });
                        break;
                    }
                }                
            });

            loader.addFsSource(fsSources[0]);
            await setTimeout(10);
            fsSources[0].fsWatcher.emitChange();
            await setTimeout(20);
            expect(c).to.equal(2);
        });

        it("should not emit until all sources have data ready", async () => {
            setup();
            let c = 0;

            loader.load$.subscribe(event => {

                switch(++c) {
                    
                    case 1: {
                        expect(event).to.deep.equal({
                            data: [FAKE_FS_DATA(0), FAKE_FS_DATA(2)],
                            dataChangeInfo: {type: LoadEventType.INITIAL_LOAD},
                            pkgName: PKG_NAME
                        });
                        break;
                    }
                }
            });           

            loader.addFsSource(fsSources[0]);                      
            loader.addFsSource(fsSources[2]);
            await setTimeout(20);
            expect(c).to.equal(1);
        });

        it("should emit correct values when multiple fs sources emit with watch on", async () => {
            setup();
            let c = 0;

            loader.load$.subscribe(event => {

                switch(++c) {
                    
                    case 1: {
                        expect(event).to.deep.equal({
                            data: [FAKE_FS_DATA(0), FAKE_FS_DATA(2)],
                            dataChangeInfo: {type: LoadEventType.INITIAL_LOAD},
                            pkgName: PKG_NAME
                        });
                        break;
                    }

                    case 2: {
                        expect(event).to.deep.equal({
                            data: [FAKE_FS_DATA(0), FAKE_FS_DATA(2)],
                            dataChangeInfo: {
                                type: LoadEventType.CHANGE,
                                filePath: `${FILE_PATH}/0`
                            },
                            pkgName: PKG_NAME                            
                        });
                        break;
                    }

                    case 3: {
                        expect(event).to.deep.equal({
                            data: [FAKE_FS_DATA(0), FAKE_FS_DATA(2)],
                            dataChangeInfo: {
                                type: LoadEventType.CHANGE,
                                filePath: `${FILE_PATH}/2`
                            },
                            pkgName: PKG_NAME                            
                        });
                        break;
                    }
                }
            });

            loader.addFsSource(fsSources[0]);          
            loader.addFsSource(fsSources[2]);
            await setTimeout(10);
            fsSources[0].fsWatcher.emitChange();
            await setTimeout(10);
            fsSources[1].fsWatcher.emitChange();
            await setTimeout(10);
            fsSources[2].fsWatcher.emitChange();

            await setTimeout(100);
            expect(c).to.equal(3);

        });

        it("should emit correct values when multiple fs sources emit with watch off", async () => {
            setup({watch: false});
            let c = 0;

            loader.load$.subscribe(event => {

                switch(++c) {
                    
                    case 1: {
                        expect(event).to.deep.equal({
                            data: [FAKE_FS_DATA(0), FAKE_FS_DATA(2)],
                            dataChangeInfo: {type: LoadEventType.INITIAL_LOAD},
                            pkgName: PKG_NAME
                        });
                        break;
                    }                   
                }
            });

            loader.addFsSource(fsSources[0]);          
            loader.addFsSource(fsSources[2]);
            await setTimeout(10);
            fsSources[0].fsWatcher.emitChange();
            await setTimeout(10);
            fsSources[1].fsWatcher.emitChange();
            await setTimeout(10);
            fsSources[2].fsWatcher.emitChange();

            await setTimeout(100);
            expect(c).to.equal(1);

        });



    });

    describe('testing the emitted values of the load$ for sub loader sources', () => {

        it("should emit correct values when adding a single subloader source and it emits a change", async () => {
            setup();

            let c = 0;

            loader.load$.subscribe(event => {

                switch(++c) {
                    case 1: {
                        expect(event).to.deep.equal({
                            data: [FAKE_SL_DATA(0)],
                            dataChangeInfo: {
                                type: LoadEventType.INITIAL_LOAD,
                            },
                            pkgName: PKG_NAME
                        });
                        break;
                    }

                    case 2: {
                        expect(event).to.deep.equal({
                            data: [FAKE_SL_DATA(1)],
                            dataChangeInfo: {
                                type: LoadEventType.CHANGE,
                            },
                            pkgName: PKG_NAME                            
                        });
                        break;
                    }
                }                
            });

            loader.addSubLoaderSource(subLoaderSources[0]);
            subLoaderSources[0].loader.load$.next({
                dataChangeInfo: {
                    type: LoadEventType.INITIAL_LOAD,                    
                },
                data: FAKE_SL_DATA(0)
            });
            await setTimeout(5);

            subLoaderSources[0].loader.load$.next({
                dataChangeInfo: {
                    type: LoadEventType.CHANGE,
                },
                data: FAKE_SL_DATA(1)
            });
            await setTimeout(10);


            expect(c).to.equal(2);
        });
        
    });

    describe("testing removeSource", () => {

        it("should remove correctly for sinle fs source", async () => {
            setup();

            let c = 0;

            loader.load$.subscribe(event => {

                switch(++c) {
                    case 1: {
                        expect(event).to.deep.equal({
                            data: [FAKE_FS_DATA(0)],
                            dataChangeInfo: {type: LoadEventType.INITIAL_LOAD},
                            pkgName: PKG_NAME
                        });
                        break;
                    }

                    case 2: {
                        expect(event).to.deep.equal({
                            data: [FAKE_FS_DATA(0)],
                            dataChangeInfo: {
                                type: LoadEventType.CHANGE,
                                filePath: `${FILE_PATH}/0`
                            },
                            pkgName: PKG_NAME                            
                        });
                        break;
                    }
                }                
            });

            loader.addFsSource(fsSources[0]);
            await setTimeout(5);
            fsSources[0].fsWatcher.emitChange();
            await setTimeout(5);
            loader.removeSource(fsSources[0].id);

            // immitating a pending watch event
            fsSources[0].fsWatcher.emitChange();
            await setTimeout(5);

            expect(c).to.equal(2);
            expect(fsSources[0].fsWatcher.close.callCount).to.equal(1);
            
        });

        it("should remove correctly for sinle sub loader source", async () => {
            setup();

            let c = 0;

            loader.load$.subscribe(event => {

                switch(++c) {
                    case 1: {
                        expect(event).to.deep.equal({
                            data: [FAKE_SL_DATA(0)],
                            dataChangeInfo: {
                                type: LoadEventType.INITIAL_LOAD,
                            },
                            pkgName: PKG_NAME
                        });
                        break;
                    }                   
                }                
            });

            loader.addSubLoaderSource(subLoaderSources[0]);
            subLoaderSources[0].loader.load$.next({
                dataChangeInfo: {
                    type: LoadEventType.INITIAL_LOAD,                    
                },
                data: FAKE_SL_DATA(0)
            });
            await setTimeout(5);

            loader.removeSource(subLoaderSources[0].id);

            await setTimeout(5);

            subLoaderSources[0].loader.load$.next({
                dataChangeInfo: {
                    type: LoadEventType.CHANGE,
                },
                data: FAKE_SL_DATA(1)
            });
            await setTimeout(10);


            expect(c).to.equal(1);
            expect(subLoaderSources[0].loader.close.callCount).to.equal(1);
        });
        
    });



    

    



});