

import {jest} from '@jest/globals';
// jest.mock('fs-extra');
// import fs from 'fs-extra';

// jest.mock('fs');
// import fs from 'fs';


import {pkgJson, pkgInfo} from './mock-data';
import {Registry} from '../../lib/registry';
import {InfoLoader} from '../../lib/registry/info-loader';

import memfs from 'memfs';
const fs = jest.createMockFromModule('fs');
fs.writeFileSync = (p, content) => {
  return memfs.fs.writeFileSync(p, content);
}
fs.readFileSync = (path, option) => {
  return memfs.fs.readFileSync(path, option);
}




const waitt = async ()=>{await new Promise((res,rej)=>{setTimeout(()=>res(),1000)})};

test('========TEST INFO LOADER', async () => {


  fs.writeFileSync('/package.json', JSON.stringify(pkgJson));
  fs.writeFileSync('/pg.yaml', JSON.stringify(pkgInfo));
  console.log(fs.readFileSync('/pg.yaml', 'utf-8'));
  
  const infoLoader = new InfoLoader({
    pkgPath: '',
    registrySettings: {
      route: 'route1',
      import: true, 
      dataPath: true, 
      channels: true, 
      settings: true 
    } 
  });

  const ans = await infoLoader.load();
  console.log('ID:',ans.data.pkgInfo.id)
  console.log('pakcageName: ', ans.data.pkgJson.name)
  expect(ans.data.pkgInfo.id).toBe('pg-test');



});