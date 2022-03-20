import path from "path";
import { FsModule } from "./fs-factory";
import fs from 'fs-extra';
import { Msg } from "../message.js";

export async function _findPkgPath(
  pkgName: string,
  fsModule: FsModule = fs
): Promise<string> {

  const rel = path.join(
    // process.cwd(),
    "node_modules",
    pkgName || "."
  ); 
  
  let exists = await fsModule.pathExists(rel);
  if(!exists) {
    throw Msg.error(
      "err-path-not-found", { pkgName }
    );
  }

  const stat = fsModule.statSync(rel);
  if(stat.isFile()) {
    throw Msg.error(
      "err-path-is-file", { pkgName }
    )
  }

  return rel;




  // const res = await findUp(async dir => {
  //   var result = await fsModule.readdir(dir);
  //   console.log(result);
  //   console.log(path.dirname(dir));
  //   console.log('currentDir: ',dir);
  //   console.log('currentPath: ',rel);
  //   console.log(process.cwd());

  //   const hasRel = await fsModule.pathExists(
  //     path.join(dir, rel)
  //   );

  //   console.log('found?' , hasRel);
  //   console.log(pkgName);
  //   console.log(hasRel && (
  //     pkgName ? path.join(dir, rel) : dir
  //   ));

  //   var stat = fsModule.statSync(rel);
  //   console.log(stat.isFile(), stat.isDirectory());

  //   return hasRel && (
  //     pkgName ? path.join(dir, rel) : dir
  //   );

  // }, { type: "directory" })

  // console.log('RES:' ,res);

  // if (!res)
  //   throw Msg.error(
  //     "err-path-not-found", { pkgName }
  //   );

  // return res;

}