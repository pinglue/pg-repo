import path from "path";
import { FsModule } from "./fs-factory";
import fs from 'fs';
import { Msg } from "../message.js";

export async function _findPkgPath(
  pkgName: string,
  fsModule: FsModule = fs
): Promise<string> {

  // if last string of pkgName is '/', remove.
  if(pkgName.match(/\/$/)) {
    pkgName = pkgName.substring(0, pkgName.length-1);
  }

  const pathlist = (pkgName || '.').split('/');
  const _pkgName = pathlist.pop();

  // if first path is '..', cannot go above root. should throw error
  if (pathlist[0] === '..') {
    throw Msg.error(
      "err-invalid-path", { pkgName }
    )
  }

  // if pkgName is '.' || '..' || '', it cannot point any of package. should throw error
  if (_pkgName.match(/^\.{1,2}$/) || _pkgName === '') {
    throw Msg.error(
      "err-invalid-pkgname", { pkgName }
    );
  }

  // loop until finish checking all path.
  // if path does not exist, go up.
  let rel: string;
  while (true) {
    let _rel = path.join(pathlist.join('/'), 'node_modules', _pkgName);
    let exists = await fsModule.pathExists(_rel);

    if (exists) {
      rel = _rel;
      break;
    }

    if (pathlist.length == 0) {
      break;
    }
    pathlist.pop();
  }

  if (!rel) {
    throw Msg.error(
      "err-path-not-found", { pkgName }
    );
  }

  const stat = await fsModule.stat(rel);
  if (stat.isFile()) {
    throw Msg.error(
      "err-path-is-file", { pkgName }
    )
  }

  return rel;
}