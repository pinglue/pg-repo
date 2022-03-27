
/**
 * if successfult, LoadEventWithData.data will be the package.json data
 * errors:
 *   - err-package-json-not-found
 *   - err-package-json-wrong-format
 *   - err-read-failed
 */

import path from "path";
import {Msg, Object, _default} from "@pinglue/utils";
import {fsWatcherFactory, FsWatcher} from "@pinglue/utils/bm-factories";

import {
    DataSource,
    Loader,
    LoaderSettings,
    LoadEventWithoutData,
    DataChangeInfo,
    LoadEventSourceType
} from "./loader.js";


export interface Settings extends LoaderSettings {

    // path to the package
    pkgPath: string;
}

export class PkgJsonLoader extends Loader {

    protected settings: Settings = {pkgPath: "."};

    protected init() {

        _default(this.settings, {pkgPath: "."});

        let pkgJsonWatcher: FsWatcher;

        if (this.settings.watch) { 
            pkgJsonWatcher = fsWatcherFactory(this.fs);
            pkgJsonWatcher.add(path.join(this.settings.pkgPath, "package.json"));
        }

        this.addFsSource({
            id: "pkg-json",
            type: "fs",
            fsWatcher: pkgJsonWatcher
        });
    }

    protected onDataChange(
        {source, dataChangeInfo}: {
            source: DataSource; 
            dataChangeInfo: DataChangeInfo;
        }
    ): LoadEventWithoutData {

        const filePath = path.resolve(
            this.settings.pkgPath,
            "package.json"
        );

        const data = this.fs.readJSONSync(filePath);
        this.setSourceData(source.id, data);

        return {
            dataChangeInfo: {...dataChangeInfo, filePath},
            changedSourceType: LoadEventSourceType.PKG_JSON,
            pkgName: data.name,
        };

    }

    protected reduce(): Object {
        return this.sources.get("pkg-json").dataSnapshot;
    }


}




