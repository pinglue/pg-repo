
import {vol, fs} from "memfs";
fs.realpath["native"] = fs.realpath;

export {vol as fakeVolume, fs as fakeFs};