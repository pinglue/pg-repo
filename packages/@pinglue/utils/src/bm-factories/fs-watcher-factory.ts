
import chokidar from "chokidar";
import path from "path";
import {default as nodeFs} from "fs";
import {EventEmitter} from "events";

import {FsModule} from "./fs-factory.js";

export function fsWatcherFactory(
    fsModule?: FsModule,
    options?: chokidar.WatchOptions
): FsWatcher {

    // defaulting to chokidar
    if (
        typeof fsModule === "undefined"
    )   return chokidar.watch([], options) as any as FsWatcher;

    // building based on fs/promises watch
    return new FsWatcher(
        fsModule, options
    );

}


export class FsWatcher extends EventEmitter {    

    pathsInfo = new Map<string, {abortSignal: AbortController}>();

    constructor(
        private fsModule: FsModule,
        private options?: chokidar.WatchOptions
    ) {
        super();
    }

    add(paths: string | string[]): FsWatcher {

        if (Array.isArray(paths)) {
            for(const path of paths) 
                this.add(path);
            return this;            
        }

        const absPath = path.resolve(paths);

        // already being watched
        if (this.pathsInfo.has(absPath)) 
            return this;
        
        // watching

        if (!this.fsModule.pathExistsSync(absPath))
            return this;
      
        const abortSignal = new AbortController();
        this.fsModule.watch(absPath, {
            signal: abortSignal
        },
        (eventType) => {            
            this.emit("all", eventType, absPath);
        });

        this.pathsInfo.set(absPath, {abortSignal});           

        return this;
    }

    unwatch(paths: string | string[]): FsWatcher {

        if (Array.isArray(paths)) {
            for(const path of paths) 
                this.unwatch(path);
            return this;            
        }

        const absPath = path.resolve(paths);

        if (!this.pathsInfo.has(absPath)) 
            return this;

        const {abortSignal} = this.pathsInfo.get(absPath);
        abortSignal.abort();

        return this;
    }

    async close(): Promise<void> {

        this.unwatch([...this.pathsInfo.keys()]);

    }

    on(event: 'add'|'addDir'|'change', listener: (path: string, stats?: nodeFs.Stats) => void): this;
    on(event: 'all', listener: (eventName: 'add'|'addDir'|'change'|'unlink'|'unlinkDir', path: string, stats?: nodeFs.Stats) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;    
    on(event: 'raw', listener: (eventName: string, path: string, details: any) => void): this;
    on(event: 'ready', listener: () => void): this;
    on(event: 'unlink'|'unlinkDir', listener: (path: string) => void): this;
    on(event: string, listener: (...args: any[]) => void) {
        return super.on(event, listener);
    }

}

