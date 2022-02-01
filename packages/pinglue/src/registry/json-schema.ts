
import type {
    Object
} from "@pinglue/utils";

/**
 * This function assumes the jss is a VALID json schema and just calculates the default value object
 * @param jss
 * @returns
 */
export function defaultValue(
    jss: Object
):
    | string
    | number
    | boolean
    | any[]
    | Object
    | null
    | undefined {

    switch (jss.type) {

        case "string": {

            if (typeof jss.default === "string")
                return String(jss.default);

            break;

        }

        case "number": {

            if (typeof jss.default === "number")
                return Number(jss.default);

            break;

        }

        case "boolean": {

            if (typeof jss.default === "boolean")
                return !!jss.default;

            break;

        }

        case "array": {

            if (Array.isArray(jss.default)) {

                return jss.default;

            }

            break;

        }

        case "object": {

            if (!jss.properties) return;

            const ans = Object.entries(jss.properties)
                .reduce(
                    (acc, [key, value]) => {

                        const res = defaultValue(value);
                        if (typeof res !== "undefined")
                            acc[key] = res;

                        return acc;

                    }, {}
                );

            if (Object.keys(ans).length === 0) return;
            else return ans;

        }

    }

}

/**
 * Whether the schema is valid or not. If not throws an exception containing a Result object explaining the compile error
 * @param jss
 * @returns
 * @throws [[Result]]
 */
export function validateSchema(jss: Object): void {
    // TODO
}
