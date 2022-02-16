import { CliActionSettings } from "cli-settings";
import { Options } from "yaml";
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import jsonToTypeScropt from 'json-schema-to-typescript';

function pascalCase(s: string) {
  return s.replace(/\-{0,1}\b(\S)/g, (_, p1) => p1.toUpperCase() );
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

export default function(settings: CliActionSettings) {
  return async(routeName: string, options: Options) => {
    routeName = routeName || "/";

    const root = '../../';

    // Find registers.yaml file and read
    const dirs: string[] = fs.readdirSync(path.join(root, '@pinglue'));
    const files = [];
    dirs.forEach(dir => {
      const filepath = path.join(root, '@pinglue', dir, 'info/routes', routeName, 'registers.yaml');
      const exists = fs.pathExistsSync(filepath);
      if(exists) {
        files.push(fs.readFileSync(filepath, 'utf8'));
      }
    });

    // 1. Convert each yaml to json, 
    // 2. Get each channel data.
    // 3. Create 3 types (params / value / return) in string format.
    const promises = [];
    files.forEach(async file => {
      const channels = yaml.parse(file);
      Object.keys(channels).forEach(channel => {
        Object.keys(channels[channel]).forEach(key => {
          if(['params', 'value', 'return'].find(type => type == key)) {
            // const typeString = createTypeString(channel, key, channels[channel][key]);

            promises.push(jsonToTypeScropt.compile(channels[channel][key], pascalCase(`${channel}-${key}`)) );
          }
        });
      });
    });

    const results = await Promise.all(promises);

    const dirToWrite = path.join('./src', routeName);
    fs.ensureDir(dirToWrite);
    fs.writeFileSync(path.join(dirToWrite, 'channels-types.ts'), results.join('\n'));
  }
}

