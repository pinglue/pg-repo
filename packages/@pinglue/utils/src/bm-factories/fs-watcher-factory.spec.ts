
import {expect} from "chai";
import path from "path";
import {fs as fakeFs, vol as fakeVol} from "memfs";
import chokidar from "chokidar";

import {fsFactory} from "./fs-factory.js";
import {FsWatcher, fsWatcherFactory} from "./fs-watcher-factory.js";

describe("fs watcher factory utils", () => {

    process.chdir("/");

    afterEach(()=>{

        fakeVol.reset();

    });

    it("should return Chokidar instance with default args", () => {
        const watcher = fsWatcherFactory();
        expect(watcher).to.be.instanceOf(chokidar.FSWatcher);
    });

    it("should not return Chokidar instance with non-default args", () => {
        const watcher = fsWatcherFactory(
            fsFactory(fakeFs, fakeFs.promises)
        );
        expect(watcher).not.to.be.instanceOf(chokidar.FSWatcher);
    });

    describe.only("testing with memfs", () => {

        let watcher: FsWatcher;

        beforeEach(() => {
            watcher = fsWatcherFactory(
                fsFactory(fakeFs, fakeFs.promises)
            );
            fakeVol.fromJSON({
                "/file.txt": "123",
                "/dir1/dir2/file.txt": "123"
            });
        });
    
        it("should watch a file and emit correct event when rewriting the file", (done) => {

            let count = 0;
            
            watcher.add("dir1/dir2/file.txt");

            watcher.on("all", (eventName, filePath)=>{         
                
                expect(filePath).to.equal("/dir1/dir2/file.txt");
                if (count++===0) {
                    watcher.close();
                    done();
                }
            });

            fakeFs.writeFileSync("dir1/dir2/file.txt", "567");
        });
    });

    

});