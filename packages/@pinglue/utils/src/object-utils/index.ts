
import type {Object} from "../types";

import {Msg} from "../message.js";


/**
 * Deep cloning anything
 * @param val
 * @returns
 */
export function _clone<T>(val: T):T {

    if (typeof val === "undefined") return;

    if (_isPrimitive(val)) return val;

    if (Array.isArray(val))
        return val.map(x=>_clone(x)) as any as T;

    return Object.keys(val).reduce(
        (acc, k) => {

            acc[k] = _clone(val[k]);
            return acc;

        }, {}
    ) as T;

}

/**
 * Deep freezes the given object
 * @param val
 * @returns
 */
export function _freeze<T>(val: T):T {

    if (
        typeof val === "undefined" ||
        _isPrimitive(val)
    )   return val;

    else if (Array.isArray(val)) {

        for(const item of val)
            _freeze(item);

    }

    else {

        for(const v of Object.values(val)) {

            _freeze(v);

        }

    }

    return Object.freeze(val);

}

/**
 * Creates a deep frozen deep clone of the given object. Returns the object if it's a primitive
 * @param val
 * @returns
 */
export function _cloneFreeze<T>(val: T):T {

    if (
        typeof val === "undefined" ||
        _isPrimitive(val)
    )   return val;

    if (Array.isArray(val))
        return Object.freeze(val.map(x=>_cloneFreeze(x))) as any as T;

    return Object.freeze(
        Object.keys(val).reduce(
            (acc, k) => {

                acc[k] = _cloneFreeze(val[k]);
                return acc;

            }, {}
        )
    ) as T;

}

export type MergeOptions = {
    mergeArray?: boolean;

    // function will throw err-field-overwritten (data: {fieldName, oldValue, newValue})
    noOverwrite?: boolean;

    // whether to use shallow or deep clone when copying objects to the target (NOTE: shallow would produce effect, i.e., the fields of the merging object might be changed ...)
    shallowClone?: boolean;
};

/**
 * Merging rules:
 *  - undefined does not overwrite (pass)
 *  - null can overwrite any type (can be used to "delete" data)
 *  - null can be overwritten by any type
 *  - primitive (string, number, boolean, symbol) can only be overwritten by primitive (or null)
 *  - array can only be overwritten by array (or null)
 *  - object can only be overwritten by null
 * @param options
 * @returns
 */
export function MergeFactory(options: MergeOptions = {}) {

    // helper method, cloning objects to be added on the target
    const clone = (options.shallowClone) ?
        (x=>x) :
        (x=>_clone(x));

    /**
     * ignores undefined/null for the obj, throws if obj is primitive
     * throws if target is not object or array or is null/undefined
     * @param target
     * @param obj
     */
    const merge = (
        target: Object,
        obj: Object,
        objectPath = ""
    ): Object => {

        // validations (edge cases)
        if (_isEmpty(target))
            throw Msg.error("err-empty-target", {
                target, objectPath
            });
        if (!_isObjOrArray(target))
            throw Msg.error("err-target-not-objarr", {
                target, objectPath
            });
        // ignoring empty obj
        if (_isEmpty(obj))
            return target;
        if (!_isObjOrArray(obj))
            throw Msg.error("err-obj-not-objarr", {
                obj, objectPath
            });

        // case of array
        if (Array.isArray(target)) {

            if (!Array.isArray(obj))
                throw Msg.error("err-merging-object-to-array", {
                    objectPath,
                    target,
                    obj
                });

            if (!options.mergeArray)
                throw Msg.error("err-merging-arrays-no-merge-options-set", {
                    objectPath,
                    target,
                    obj
                });

            // array merge
            target.push(...obj.map(x=>clone(x)));

            return target;

        }

        // case of object

        if (Array.isArray(obj))
            throw Msg.error("err-merging-array-to-object", {
                objectPath,
                target,
                obj
            });

        // going over obj fields
        for(const k of Object.keys(obj)) {

            // case of safe overwriting
            if (typeof target[k] === "undefined") {

                target[k] = clone(obj[k]);

            }

            // case of empty field (pass)
            // TODO: shall this be delete?
            else if (typeof obj[k] === "undefined")
                continue;

            // case of overwriting null (anything can overwrite null)
            else if (target[k] === null) {

                if (options.noOverwrite)
                    throw Msg.error("err-field-overwriting", {
                        objectPath: `${objectPath}.${k}`,
                        oldValue: null,
                        newValue: obj[k]
                    });
                target[k] = clone(obj[k]);

            }

            // null overwriting (null can overwrite anything)
            else if (obj[k] === null) {

                if (options.noOverwrite)
                    throw Msg.error("err-field-overwriting", {
                        objectPath: `${objectPath}.${k}`,
                        oldValue: target[k],
                        newValue: null
                    });
                target[k] = null;

            }

            // case of primitive overwriting: both are primitive (primitive can only write primitive)
            else if (
                _isPrimitive(target[k]) &&
                _isPrimitive(obj[k])
            ) {

                if (options.noOverwrite)
                    throw Msg.error("err-field-overwriting", {
                        objectPath: `${objectPath}.${k}`,
                        oldValue: target[k],
                        newValue: obj[k]
                    });

                // overwrite
                target[k] = obj[k];

            }

            // both are arrays (array can only overwrite array)
            else if (
                Array.isArray(target[k]) &&
                Array.isArray(obj[k])
            ) {

                // array merge
                if (options.mergeArray)
                    target[k].push(...obj[k].map(x=>clone(x)));
                // overwriting
                else {

                    if (options.noOverwrite)
                        throw Msg.error("err-field-overwriting", {
                            objectPath: `${objectPath}.${k}`,
                            oldValue: target[k],
                            newValue: obj[k]
                        });

                    target[k] = clone(obj[k]);

                }

            }

            // both are objects (recursion)
            else if (
                _isObjOrArray(target[k]) &&
                _isObjOrArray(obj[k])
            ) {

                merge(
                    target[k],
                    obj[k],
                    `${objectPath}.${k}`
                );

            }

            // unmatching fields
            else {

                throw Msg.error("err-merging-unmatching-fields", {
                    objectPath: `${objectPath}.${k}`,
                    oldValue: target[k],
                    newValue: obj[k]
                });

            }

        }

        return target;

    };

    return merge;

}

/*type MergableObj = Object | null | undefined;

type MergeHelper = (
    target: Object,
    ...objs: MergableObj[]
) => Object;*/


export const _merge =
    MultiArgFactory(
        MergeFactory()
    );

export const _mergeArr =
    MultiArgFactory(
        MergeFactory({
            mergeArray: true
        })
    );

export const _mergeClean =
    MultiArgFactory(
        MergeFactory({
            noOverwrite: true
        })
    );

export const _mergeArrClean =
    MultiArgFactory(
        MergeFactory({
            noOverwrite: true,
            mergeArray: true
        })
    );

function defaultOne(
    target: Object,
    obj?: Object | null,
    objectPath = ""
) {

    // validations (edge cases)
    if (_isEmpty(target))
        throw Msg.error("err-empty-target", {
            target, objectPath
        });
    if (
        typeof target !== "object" ||
        Array.isArray(target)
    )   throw Msg.error("err-target-not-obj", {
        target, objectPath
    });
    // ignoring empty obj
    if (_isEmpty(obj))
        return target;
    if (typeof obj !== "object" ||
        Array.isArray(obj)
    )   throw Msg.error("err-obj-not-obj", {
        obj, objectPath
    });

    // going over obj fields
    for(const k of Object.keys(obj)) {

        // target[k] does not exists (defaulting)
        if (typeof target[k] === "undefined") {

            target[k] = _clone(obj[k]);

        }

        // target[k] is array or primitive (no defaulting)
        else if (
            _isPrimitive(target[k]) ||
            Array.isArray(target[k])
        )   continue;

        // target[k] is an object (recursion)
        else {

            defaultOne(
                target[k],
                obj[k],
                `${objectPath}.${k}`
            );

        }

    }

    return target;

}

export const _default =
    MultiArgFactory(defaultOne);

/* aux functions
======================== */

/**
 * null is also considered as primitive in the merge context
 * @param val
 * @returns
 */
function _isPrimitive(val: any): boolean {

    return  (val === null) ||
            [
                "string",
                "number",
                "boolean",
                "symbol",
                "function"
            ].includes(typeof val);

}

function _isEmpty(val: any): boolean {

    return (
        val === null ||
        typeof val === "undefined"
    );

}

/**
 * obj means non-null object
 * @param val
 * @returns
 */
function _isObjOrArray(val: any): boolean {

    return (val && typeof val === "object");

}

type TwoArgUtil<T> = (
    target: T, obj: T | null | undefined
) => T;

type MultiArgUtil<T> = (
    target: T, ...objs: (T | null | undefined)[]
) => T;

function MultiArgFactory<T extends Object>(
    func: TwoArgUtil<T>
): MultiArgUtil<T> {

    return (target: T, ...objs: (T | null | undefined)[]) => {

        for (const obj of objs)
            func(target, obj);

        return target;

    };

}
