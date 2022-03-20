
import { expect } from "chai";
import { fs as fakeFs, vol as fakeVol } from "memfs";
import { _findPkgPath } from './fs-find-pkg-path.js';
import { fsFactory } from "./fs-factory.js";


describe('fs find pkg path', () => {
  process.chdir('./');
  const fs = fsFactory(fakeFs, fakeFs.promises);

  beforeEach(() => {
    fakeVol.fromNestedJSON({
      'node_modules': {
        'package1': {
          'package.js': 'test',
        },
      }
    });
  });

  afterEach(() => {
    fakeVol.reset();
  });

  it('should return pkgPath', async () => {
    const res = await _findPkgPath('package1', fs);
    expect(res).to.equal('node_modules/package1');
  });

  it('should get error because pkg does not exist', async () => {
    try {
      const res = await _findPkgPath('package_not_exist', fs);
      expect(res, null);
    } catch (error) {
      expect(error).to.include({ code: 'err-path-not-found' });
    }
  });

  it('should get error because arg is file', async () => {
    try {
      const res = await _findPkgPath('package1/package.js', fs);
      expect(res, null);
    } catch (error) {
      expect(error).to.include({ code: 'err-path-is-file' });
    }
  });

})