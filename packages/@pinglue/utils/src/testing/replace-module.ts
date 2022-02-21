
import * as td from "testdouble";

export async function replaceModule(
    originalModuleName: string,
    fakeInstance: any = {},
    fakeDefaultEsmInstance?: any
) {

    if (!originalModuleName)
        throw new Error("No module name given");

    await td.replaceEsm(
        originalModuleName,
        fakeInstance,
        fakeDefaultEsmInstance || fakeInstance
    );

    await td.replace(
        originalModuleName, fakeInstance
    );

}

export function resetModules() {

    td.reset();

}