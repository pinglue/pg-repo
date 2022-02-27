
import quibble from "quibble";

export async function replaceModule(
    originalModuleName: string,
    fakeInstance: any = {},
    fakeDefaultEsmInstance?: any
) {

    if (!originalModuleName)
        throw new Error("No module name given");

    // CommonJS replacement
    quibble(
        originalModuleName, fakeInstance
    );

    // ESM replacement
    await quibble.esm(
        originalModuleName,
        fakeInstance,
        fakeDefaultEsmInstance || fakeInstance
    );

}

export function resetModules() {

    quibble.reset();

}

export * from "quibble";
