import { CliActionSettings } from "cli-settings";
import { Options } from "yaml";
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import jsonToTypeScript from 'json-schema-to-typescript';

export default function (settings: CliActionSettings) {
  return async (routeName: string, options: Options) => {
    routeName = routeName || './';
    const {print, style} = settings;

    // Find registers.yaml file and read
    print('Loading pg.yaml file...\n');

    const filepath = 'pg.yaml';

    const file =
      fs.pathExistsSync(filepath) &&
      fs.readFileSync(filepath, 'utf8');

    if (!file) {
      print.warn(`pg.yaml not found. Aborted. \n`);
      return;
    }

    print('pg.yaml file found. compiling...\n');

    let json: { [k: string]: any };
    try {
      json = yaml.parse(file, { prettyErrors: true });
    } catch (error) {
      print.error('Could not compile pg.yaml into json format. It may be caused because pg.yaml has incorrect format:', error);
      return;
    }

    let promise: Promise<String>;
    for (let [key, val] of Object.entries(json)) {
      if (key === 'settings') {
        promise = jsonToTypeScript.compile(val,'Settings', {bannerComment: '/* generated automatically by pinglue-cli */'});
      }
    }

    if(!promise) {
      print.error('Could not find settings definition in pg.yaml. To generate setting type, please set settings section in pg.yaml');
      return;
    }

    let settingsType: String;
    try {
      settingsType = await promise;      
    } catch (error) {
      print.error('Could not compile settings data into typescript format properly. It may be caused because pg.yaml has incorrect format\n', error);
      return;
    }

    print.success('Compile done. exporting...\n');

    const destPath = path.join('./src', 'settings.ts');
    try {
      // fs.ensureDir(dirToWrite);
      fs.writeFile(destPath, settingsType);  
    } catch (error) {
      print.error('Could not export type definitions in settings.ts file.', error);
      return;
    }

    print.success(`Output file is located at ${destPath}\n`);

  }
}