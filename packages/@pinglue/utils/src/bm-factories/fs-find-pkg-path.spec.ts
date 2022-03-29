
import { expect } from "chai";
import { fs as fakeFs, vol as fakeVol } from "memfs";
import { _findPkgPath } from './fs-find-pkg-path.js';
import { fsFactory } from "./fs-factory.js";


describe('fs find pkg path', () => {
  process.chdir('/');
  const fs = fsFactory(fakeFs, fakeFs.promises);

  beforeEach(() => {
    fakeVol.fromNestedJSON({
      'node_modules': {
        'package1': {
          'package1.js': 'package1 test',
          'node_modules': {
            'package1a': {
              'package1a.js': 'package1a test',
            }
          }
        },
      },
      'path1': {
        'node_modules': {
          'package2': {
            'package2.js': 'package2 test',
            'node_modules': {
              'package2a': {
                'package2a.js': 'package2a test',
              }
            }
          }
        },
        'path1a': {
          'path1a.js': 'path1a test',
          'node_modules': {
            'package3': {
              'package3.js': 'package3 test',
              'node_modules': {
                'package3a': {
                  'package3a.js': 'package3a test'
                }
              }
            }
          }
        }
      }
    });
  });

  afterEach(() => {
    fakeVol.reset();
  });

  it('should return pkgPath', async () => {
    try {
      const res = await _findPkgPath('package1', fs);
      expect(res).to.equal('node_modules/package1');
    } catch (error) {
      expect(error).to.equal(null);
    }
    try {
      // this actual path is /package1/package1. it matches with /package1
      const res = await _findPkgPath('package1/package2/../package1/', fs);
      expect(res).to.equal('node_modules/package1');
    } catch (error) {
      expect(error).to.equal(null);
    }
    try {
      // this actual path is /path1/path1a/package3. it matches with /package3
      const res = await _findPkgPath('path1/path1a/../path1a/package3', fs);
      expect(res).to.equal('path1/path1a/node_modules/package3');
    } catch (error) {
      console.log(error);
      expect(error).to.equal(null);
    }
    try {
      // this actual path is /path1/path1a/package1/package2/package3. it matches with /package3
      const res = await _findPkgPath('path1/path1a/../path1a/package1/package2/package3', fs);
      expect(res).to.equal('path1/path1a/node_modules/package3');
    } catch (error) {
      expect(error).to.equal(null);
    }
  });

  it('should get error because given path exists but not within node_modules folder', async () => {
    try {
      const res = await _findPkgPath('path1/path1a/path1a.js', fs);
      expect(res).to.equal(null);
    } catch (error) {
      expect(error).to.include({ code: 'err-path-not-found' });
    }
    try {
      const res = await _findPkgPath('path1/path1a', fs);
      expect(res).to.equal(null);
    } catch (error) {
      expect(error).to.include({ code: 'err-path-not-found' });
    }
  });

  it('should get error because given pkgName is child package in node_modules', async () => {
    try {
      const res = await _findPkgPath('package1/package1a', fs);
      expect(res).to.equal(null);
    } catch (error) {
      expect(error).to.include({ code: 'err-path-not-found' });
    }
  });

  it('should get error because pkg does not exist', async () => {
    try {
      const res = await _findPkgPath('package_not_exist', fs);
      expect(res).to.equal(null);
    } catch (error) {
      expect(error).to.include({ code: 'err-path-not-found' });
    }
  });

  it('should get error because pkgName is invalid', async () =>{
    try {
      const res = await _findPkgPath('package1//', fs);
      expect(res).to.equal(null);
    } catch (error) {
      expect(error).to.include({ code: 'err-invalid-pkgname' });
    }
    try {
      const res = await _findPkgPath('package1/./', fs);
      expect(res).to.equal(null);
    } catch (error) {
      expect(error).to.include({ code: 'err-invalid-pkgname' });
    }
    try {
      const res = await _findPkgPath('package1/../', fs);
      expect(res).to.equal(null);
    } catch (error) {
      expect(error).to.include({ code: 'err-invalid-pkgname' });
    }
  });

  it('should get error because it tries to go above root', async () => {
    try {   
      await _findPkgPath('../package1', fs);
    } catch (error) {
      expect(error).to.include({ code: 'err-invalid-path'});
    }  
  });
});