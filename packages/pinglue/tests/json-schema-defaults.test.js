
import {defaultValue} from "../lib/registry/json-schema.js";


/*test("empty/invalid type for the schema", () => {
    
    
    [{}, {type:"sstring"}, {}, null, undefined, false, 12, "string", [12,3]].forEach(jss => {
        expect(defaultValue(jss)).toBeUndefined();
    });    
}*/

test("single string", () => {
    
    let jss = {
        type: "string",
        default: "default1"        
    } 
    expect(defaultValue(jss)).toBe("default1");

    jss = {
        type: "string"
    }
    expect(defaultValue(jss)).toBeUndefined();
});

test("single number", () => {
    
    let jss = {
        type: "number",
        default: 12        
    } 
    expect(defaultValue(jss)).toBe(12);

    jss = {
        type: "number"
    }
    expect(defaultValue(jss)).toBeUndefined();
});

test("single boolean", () => {
    
    let jss = {
        type: "boolean",
        default: true        
    } 
    expect(defaultValue(jss)).toBe(true);

    jss = {
        type: "boolean",
        default: false        
    } 
    expect(defaultValue(jss)).toBe(false);

    jss = {
        type: "boolean"
    }
    expect(defaultValue(jss)).toBeUndefined();
});

test("array of strings", () => {
    
    let jss = {
        type: "array",
        items: {type:"string"},
        default: ["aa", "bb"]    
    } 
    expect(defaultValue(jss)).toEqual(["aa", "bb"]);

    jss = {
        type: "array",
        items: {type:"string"}
    }
    expect(defaultValue(jss)).toBeUndefined();    
});

test("array of numbers", () => {
    
    let jss = {
        type: "array",
        items: {type:"number"},
        default: [1,2,3]    
    } 
    expect(defaultValue(jss)).toEqual([1,2,3]);

    jss = {
        type: "array",
        items: {type:"number"}
    }
    expect(defaultValue(jss)).toBeUndefined();
});

test("object with one level", () => {
    
    const jss = {
        type: "object",
        properties: {
            strProp1: {
                type: "string",
                default: "default value"
            },
            strProp2: {
                type: "string"                
            },
            numProp1: {
                type: "number",
                default: 123
            },
            numProp2: {
                type: "number"                
            },
            boolProp1: {
                type: "boolean",
                default: true
            },
            boolProp2: {
                type: "boolean",
                default: false
            },
            boolProp3: {
                type: "boolean"                
            },
            arrProp1: {
                type: "array",
                items: {type: "string"},
                default: ["aa", "bb"]
            },
            arrProp2: {
                type: "array",
                items: {type: "number"}
            }
        }
        
    } 
    expect(defaultValue(jss)).toEqual({
        strProp1: "default value",
        numProp1: 123,
        boolProp1: true,
        boolProp2: false,
        arrProp1: ["aa", "bb"]
    });
});


test("nested object", () => {
    
    const jss = {
        type: "object",
        properties: {
            strProp1: {
                type: "string",
                default: "default value"
            },
            strProp2: {
                type: "string"                
            },
            numProp1: {
                type: "number",
                default: 123
            },
            numProp2: {
                type: "number"                
            },
            boolProp1: {
                type: "boolean",
                default: true
            },
            boolProp2: {
                type: "boolean"                
            },
            arrProp1: {
                type: "array",
                items: {type: "string"},
                default: ["aa", "bb"]
            },
            arrProp2: {
                type: "array",
                items: {type: "number"}
            },
            objProp1: {
                type: "object",
                properties: {
                    strProp1: {
                        type: "string",
                        default: "default value"
                    },
                    strProp2: {
                        type: "string"                
                    },
                    numProp1: {
                        type: "number",
                        default: 123
                    },
                    numProp2: {
                        type: "number"                
                    },
                    objProp1: {
                        type: "object",
                        properties: {
                            strProp1: {
                                type: "string",
                                default: "default value"
                            },
                            strProp2: {
                                type: "string"                
                            }
                        }
                    }
                }
            },
            objProp2: {
                type: "object",
                properties: {
                    strProp2: {
                        type: "string"                
                    },
                    numProp2: {
                        type: "number"                
                    }
                }
            }
        }
    }

    expect(defaultValue(jss)).toEqual({
        strProp1: "default value",
        numProp1: 123,
        boolProp1: true,
        arrProp1: ["aa", "bb"],
        objProp1: {
            strProp1: "default value",
            numProp1: 123,
            objProp1: {
                strProp1: "default value"
            }
        }
    });

});