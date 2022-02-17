import { CliActionSettings } from "cli-settings";
import { Options } from "yaml";
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import jsonToTypeScropt from 'json-schema-to-typescript';
import { print, style } from "@pinglue/print/node";

function pascalCase(s: string) {
  return s.replace(/\-{0,1}\b(\S)/g, (_, p1) => p1.toUpperCase());
}

// function createTypeString(channelname: string, keyname: string, data: {[k: string]: any}): string {
//   let converted: any;
//   switch(data.type) {
//     case 'object':
//       converted = {
//         ...data.additionalProperties === true && { '[k: string]': 'any' }
//       }
//       for(let key in data.properties) {
//         const keyname = key + ((data.required as Array<string>).indexOf(key) < 0 ? '?' : '');
//         converted[keyname] = data.properties[key].type;
//       }
//       break;
//     default: 
//   }

//   return `export type ${pascalCase(`${channelname}-${keyname}`)} = ${JSON.stringify(converted)}`;
// }

export default function (settings: CliActionSettings) {
  return async (routeName: string, options: Options) => {
    routeName = routeName || "/";

    // Find registers.yaml file and read
    print('Looking for registers.yaml file...\n');

    const filepath = path.join('info/routes', routeName, 'registers.yaml');
    const exists = fs.pathExistsSync(filepath);
    let file = exists ? fs.readFileSync(filepath, 'utf8') : null;
    if (!file) {
      print.warn('registers.yaml not found. exited. \n');
      return;
    }

    print('registres.yaml file found. compiling...\n');

    // 1. Convert each yaml to json, 
    // 2. Get each channel data.
    // 3. Create 3 types (params / value / return) in string format.
    const promises: Promise<string>[] = [];
    let results: string[];

    let channels: {[k: string]: {[k: string]: any}};
    try{
      channels = yaml.parse(file, {prettyErrors: true});
    } catch(error) {
      print.error('Could not compile register.yaml into json format. It may be caused because registers.yaml if incorrect format\n');
      print('Here is more information.');
      print(style.errorObj(error));
      return;
    }

    for(let channel in channels) {
      for(let key in channels[channel]) {
        if(['params', 'value', 'return'].find(type => type == key)) {
          promises.push(jsonToTypeScropt.compile(channels[channel][key], pascalCase(`${channel}-${key}`)));
        }
      }
    }

    if(promises.length == 0) {
      print.warn('No definition found in registers.yaml. To proceed, registers.yaml should have at least one of [params, value, return] properties.\n');
      return;
    }

    try {
      results = await Promise.all(promises);
    } catch (error) {
      print.error('Could not compile json data into typescript format properly. It may be caused because registers.yaml is incorrect format\n');
      print('Here is more information.');
      print(style.errorObj(error));
      return;
    }

    print('Compile done. exporting...\n');

    const dirToWrite = path.join('./src', routeName);
    try {
      fs.ensureDir(dirToWrite);
      fs.writeFile(path.join(dirToWrite, 'channels-types.ts'), results.join('\n'));  
    } catch (error) {
      print.error('Could not export type definitions in channels-types.ts file.\n');
      print('Here is more information.')
      print(style.errorObj(error));
    }

    print.success(`Output file is located at ${path.join(dirToWrite, 'channels-types.ts')}\n`)
  }
}

