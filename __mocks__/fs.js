import {jest} from '@jest/globals'
import memfs from 'memfs';

// jest.mock('fs');

// const fs = jest.createMockFromModule('fs-extra');
// fs.writeFileSync = (path, content) => {
//   return memfs.fs.writeFileSync(path, content);
// }
// fs.readFileSync = (path, option) => {
//   return memfs.fs.readFileSync(path, option);
// }

module.exports = memfs;
// import {fs} from 'memjs';
// export default {fs};