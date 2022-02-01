
export type UniUiElementEventHandler = (event: any) => void;

export type UniUiStatus = "no-render" | "shown" | "hidden" | "invisible" | "busy" | "disabled";

export interface UniUiElement {

    // essential props (getter/setter)

    status: UniUiStatus;

    value: any; // input value coming from the user

    data: any; // data to be displayed by the element (i.e., in base html elements data could be a text of inner html, in more complex components data would be rendered in custom ways)

    // element props
    getProp: (attName: string) => any;
    getProps: (attNames: string[]) => Record<string, any>;
    setProp: (attName: string, attVal: any) => void;
    setProps: (object: Record<string, any>) => void;

    // event handling

    addEventListener: (
        eventName: string,
        handler: UniUiElementEventHandler
    ) => void;

    removeEventListener: (
        eventName: string,
        handler: UniUiElementEventHandler
    ) => void;
}
