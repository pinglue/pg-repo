
import {vol, fs} from "memfs";

fs.realpath.native = fs.realpath;
fs.__fake = true;
export {vol as fakeVolume, fs as fakeFs};