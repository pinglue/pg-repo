
import {expect} from "chai";

import path from "path";

import {fs as fakeFs, vol as fakeVol} from "memfs";

import {_readYaml} from "./fs-yaml.js";
import {fsFactory} from "./fs-factory.js";

const YAML_FILE = 
`
field1: 12
field2:
  - item1
  - item2
`;

const YAML_DATA = {
    field1: 12,
    field2: ["item1", "item2"]
}

describe("fs yaml utils", () => {

    process.chdir("/");

    const fs = fsFactory(fakeFs, fakeFs.promises);

    beforeEach(() => {
        
        fakeVol.fromNestedJSON({
            "file.yaml": YAML_FILE
        });

    });

    afterEach(()=>{

        fakeVol.reset();

    });

    it("should return the correct data for yaml file", async () => {
        
        const data = await _readYaml("file.yaml", fs);
        
        expect(data).to.deep.equal(YAML_DATA);

    });

});