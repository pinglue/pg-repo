
import {
    Message,
    Msg,
    Object,
    Printer,
    Styler,
    _default    
} from "@pinglue/utils";

import {FsModule, fsFactory} from "@pinglue/utils/bm-factories";
import { emptyPrint, emptyStyle } from "@pinglue/utils";

import {
    _clone
} from "@pinglue/utils";

import {FsWatcher} from "@pinglue/utils/bm-factories";

import {Subject, pipe} from "rxjs";
import {take} from "rxjs/operators"


export enum LoadEventSourceType {

    SOURCE,             // source code
    LOCAL_SETTINGS,     // data/pkgName/settings.yaml
    PG_INFO,            // pg.yaml of the package
    PKG_JSON,           // package.json
    CHANNELS_SETTINGS,  // yaml files in channels folder
    PROJECT_INFO,       // project root pg.yaml
    ENV,                // env setting file
    PROFILES,           // profile file(s)
    UNKNOWN             // anything else (including initial load)    
}


export enum LoadEventType {

    INITIAL_LOAD,   // initial load
    CHANGE,         // load due to generic change (add/change/delete file/dir)

    // more granular change (to be implemented later)
    FILE_CHANGE,
    FILE_ADD,
    FILE_DELETE,
    DIR_CHANGE,
    DIR_ADD,
    DIR_DELETE,

    UNKNOWN    
}

/**
 * represents info about a change in data
 */
interface DataChangeInfo {

    type: LoadEventType;

    // all being undefined means this is the initial load
    filePath?: string;
    filePaths?: string[];
    dirPath?: string;
    dirPaths?: string[];
}

export interface LoadEvent {

    dataChangeInfo: DataChangeInfo

    // the new data snapshot calculated after applying all these changes
    data?: Object | null;
    
    changedSourceType?: LoadEventSourceType;

    // not set for the project - only set for installed packages on the project
    pkgName?: string;

    error?: Message;
}

export interface LoadEventError extends LoadEvent {
    data: never;
    error: Message;
}

export interface LoadEventWithData extends LoadEvent {
    data: Object|null;
}

export interface LoadEventWithoutData extends LoadEvent {
    data: never;
}
 

/**
 * The base loader settings. Any loader extends this interface for its settings.
 */
 export interface LoaderSettings {    

    watch?: boolean;

    /**
     * defaults to empty printer at Registry, other loaders inherit from their parent loader
     */
    print?: Printer;

    /**
     * defaults to empty styler at Registry, other loaders inherit from their parent loader
     */
    style?: Styler;

    /**
     * fs module for file operations (same signature as those made by fs-factory in @pinglue/utils)
     */
    fs?: FsModule;

}

// a generic source of data - could represent a file or a loader
export interface DataSource {

    id: string;

    type: "fs" | "sub-loader";
    
    meta?: Object;
}

export interface FsDataSource extends DataSource {
    type: "fs";
    fsWatcher?: FsWatcher;
}

export interface SubLoaderDataSource extends DataSource {
    type: "sub-loader";
    loader: Loader;
}

// for internal use in Loader class
interface DataSourceInfo {
    source: DataSource;
    dataSnapshot?: null | Object;
}

export abstract class Loader {
    
    // shorthands
    protected readonly print: Printer = this.settings?.print || emptyPrint;
    protected readonly style: Styler = this.settings?.style || emptyStyle;
    protected readonly fs: FsModule = this.settings?.fs || fsFactory();

    // main state model - a map from source id to source object
    protected readonly sources = new Map<string, DataSourceInfo>();

    // main output
    readonly load$ = new Subject<LoadEventWithData|LoadEventError>();

    constructor(
        protected settings: LoaderSettings = {}
    ) {
        this.init();
    }

    protected abstract init();

    /**
     * 
     * @param param0 
     * @throws if any error happen (in case of error will emit and error load event)
     */
     protected  abstract onDataChange({
        source,
        dataChangeInfo 
    }: {
        source: DataSource,
        dataChangeInfo: DataChangeInfo
    }): LoadEventWithoutData;   

    // undefined means no data was calcultaed, so no emit
    protected  abstract reduce(): Object|null|undefined;

    // helpers

    #isAllDataAvailable(): boolean {
        return [...this.sources.values()].every(info=>!!info.dataSnapshot);
    }

    #emitLoad(event?: LoadEventWithoutData) {
        if (!this.#isAllDataAvailable()) return;

        let data: Object|null|undefined;
        try {
            data = this.reduce();
        }
        catch(error) {
            this.#emitError(error, event);
            return;
        }

        if (typeof data !== "undefined") this.load$.next(
            _default(event, {
                dataChangeInfo: {type: LoadEventType.UNKNOWN},
                data
            }) as LoadEventWithData);
    }

    #emitError(error: Message, event?: LoadEventWithoutData) {
        this.load$.next(
            _default(event, {
                dataChangeInfo: {type: LoadEventType.UNKNOWN},
                error,
            }) as LoadEventError);
    }

    addFsSource(source: FsDataSource) {
        // already added
        if (this.sources.has(source.id)) return;
        this.sources.set(source.id, {source});

        // handling data change for fs data source        

        if (this.settings.watch && source.fsWatcher) {
            source.fsWatcher.on("all", (eventName, filePath)=>{
                if (!this.sources.has(source.id)) return;
                try {
                    const loadEvent = this.onDataChange({
                        source, 
                        dataChangeInfo: {type: LoadEventType.CHANGE, filePath}
                    });
                    this.#emitLoad(loadEvent);
                }
                catch(error) {
                    this.#emitError(error);
                }
            });
        }

        // initial file load

        setImmediate(()=>{
            try {
                const loadEvent = this.onDataChange({
                    source, 
                    dataChangeInfo: {type: LoadEventType.INITIAL_LOAD}
                });
                this.#emitLoad(loadEvent);
            }
            catch(error) {
                this.#emitError(error);
            }
        });        
    }

    addSubLoaderSource(source: SubLoaderDataSource) {
        // already added
        if (this.sources.has(source.id)) return;
        this.sources.set(source.id, {source});
        

        const obs$ = this.settings.watch
            ? source.loader.load$
            : source.loader.load$.pipe(take(1));

        obs$.subscribe(async (loadEvent: LoadEventWithData|LoadEventError)=>{
            if (!this.sources.has(source.id)) return;

            if (loadEvent.error) {
                this.#emitError(loadEvent.error);
                return;
            }

            const previousData = this.getSourceData(source.id);
            this.setSourceData(source.id, loadEvent.data);

            try {
                const loadEvent2 = this.onDataChange({
                    source,
                    dataChangeInfo: {
                        type: previousData?LoadEventType.CHANGE:LoadEventType.INITIAL_LOAD,
                        ...loadEvent.dataChangeInfo.filePath?{filePath: loadEvent.dataChangeInfo.filePath}:{}
                    }
                });
                this.#emitLoad(loadEvent2);
            }
            catch(error) {
                this.#emitError(error);
            }
        });
    }

    /**
     * 
     * @param sourceId 
     * @returns 
     * @throws if source id not found
     */
    getSourceData(sourceId: string) {
        if (!this.sources.has(sourceId)) 
            throw Msg.error("err-source-not-found", {sourceId});
        return this.sources.get(sourceId).dataSnapshot;
    }

    /**
     * 
     * @param sourceId 
     * @param data 
     * @throws if source id not found
     */
    setSourceData(sourceId: string, data: null|Object) {
        if (!this.sources.has(sourceId)) 
            throw Msg.error("err-source-not-found", {sourceId});
        this.sources.get(sourceId).dataSnapshot = data;
    }
    

    removeSource(source: FsDataSource|SubLoaderDataSource) {
        // not there?
        if (!this.sources.has(source.id)) return;
        this.sources.delete(source.id);

        // unsubscribe
        if (source.type === "sub-loader")
            source.loader.load$.complete();
        else if (source.type === "fs") 
            source.fsWatcher.close();
    }   
}