
module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        "node": true,
        // TODO: add lint for jest file
        //"jest/globals": true
    },
    "extends": [
        //"plugin:jest/recommended",
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 2019,
        "sourceType": "module",
        "project": "tsconfig.json",
    },
    "plugins": [
        "@typescript-eslint",
    ],    
    "rules": {

        // potential bugs
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": "error",        
        "@typescript-eslint/no-dupe-class-members": "error",
        "@typescript-eslint/no-duplicate-imports": "warn",
        "@typescript-eslint/no-redeclare": "error",
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/no-for-in-array": "error",
        "@typescript-eslint/no-require-imports": "error",
        "@typescript-eslint/default-param-last": "warn",       
        "@typescript-eslint/dot-notation": "warn",
        "@typescript-eslint/no-shadow": "warn",
        "@typescript-eslint/return-await": "warn",
        "@typescript-eslint/adjacent-overload-signatures": "warn",
        "@typescript-eslint/no-unnecessary-type-assertion": "warn",
        "@typescript-eslint/prefer-for-of": "warn",
        "@typescript-eslint/prefer-optional-chain": "warn",
        "@typescript-eslint/promise-function-async": "warn",
        "@typescript-eslint/unbound-method": ["error", {
            "ignoreStatic": true
        }],
        "no-unreachable": "error",

        // code styles
        "@typescript-eslint/quotes": [
            "warn", "double", { "avoidEscape": true }
        ],
        "@typescript-eslint/type-annotation-spacing": "warn",
        "@typescript-eslint/padding-line-between-statements": [
            "warn", {
                "blankLine": "always",
                "prev": "*",
                "next": ["interface", "type", "block-like"]
            }
        ],
        "padded-blocks": ["warn", "always"],
        "@typescript-eslint/indent": ["warn", 4],
        "no-trailing-spaces": "warn",
        "@typescript-eslint/space-before-function-paren": ["warn", "never"],
        "@typescript-eslint/space-infix-ops": ["warn", { "int32Hint": false }],       
        "no-multiple-empty-lines": ["warn", { "max": 1, "maxEOF": 0, "maxBOF":1}],        
        "@typescript-eslint/brace-style": ["warn", "stroustrup"],
        "@typescript-eslint/comma-dangle": "warn",
        "@typescript-eslint/comma-spacing": "warn",
        "@typescript-eslint/semi": "warn",
        "@typescript-eslint/member-delimiter-style": "warn"
    }
};
