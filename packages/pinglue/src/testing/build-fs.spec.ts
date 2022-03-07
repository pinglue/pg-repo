
import {expect} from "chai";

import {buildPackageFs, buildProjectFs} from "./build-fs.js";

describe("build-fs testing tools", () => {

    describe("buildPackageFs", () => {

        const pgYaml = "id: test-pkg\ntype: plugin";

        it("correct answer when only name is present", () => {

            const ans = buildPackageFs({
                name: "@test/test-pkg"
            });

            expect(ans).to.deep.equal({
                "package.json": JSON.stringify({
                    name: "@test/test-pkg",
                    type: "module"
                })
            });

        });

        it("correct answer with main, exports and pgYaml fields", () => {

            const ans = buildPackageFs({
                name: "@test/test-pkg",
                main: "./lib/index.js",
                exports: {
                    "./frontend": "./lib/frontend/index.js"
                },
                pgYaml
            });

            expect(ans).to.deep.equal({
                "package.json": JSON.stringify({
                    name: "@test/test-pkg",
                    main: "./lib/index.js",
                    exports: {
                        "./frontend": "./lib/frontend/index.js"
                    },
                    type: "module"
                }),
                "pg.yaml": pgYaml
            });

        });

        it("correct answer with all package json fields and a custom file structure", () => {

            const ans = buildPackageFs({
                name: "@test/test-pkg",
                version: "1.2.3",
                main: "./lib/index.js",
                exports: {
                    "./frontend": "./lib/frontend/index.js"
                },
                pgYaml,
                fs: {
                    "pg.yaml": "id: test-pkg2\ntype: plugin",
                    info: {
                        "info.md": "lablab"
                    },
                    lib: {
                        "index.js": "console.log(\"Hello world\");"
                    }
                }
            });

            expect(ans).to.deep.equal({
                "package.json": JSON.stringify({
                    name: "@test/test-pkg",
                    version: "1.2.3",
                    main: "./lib/index.js",
                    exports: {
                        "./frontend": "./lib/frontend/index.js"
                    },
                    type: "module"
                }),
                "pg.yaml": "id: test-pkg2\ntype: plugin",
                info: {
                    "info.md": "lablab"
                },
                lib: {
                    "index.js": "console.log(\"Hello world\");"
                }
            });

        });

    });

    describe("buildPackageFs", () => {

        const pgYaml = "id: test-pkg\ntype: plugin";

        // empty package
        const PKG0 = {
            name: "pkg0"
        };

        // minimal: only pg.yaml
        const PKG1 = {
            name: "pkg1",
            pgYaml: "id: pkg1\ntype: plugin"
        };

        // regular package with localSettings
        const PKG2 = {
            name: "pkg2",
            version: "1.0.0",
            main: "index.js",
            exports: {
                "./frontend": "./lib/frontend/index.js"
            },
            pgYaml: "id: pkg2\ntype: plugin",
            localSettings: "a: 2\nb: value"
        };

        // regular scoped package with localSettings
        const PKG3 = {
            name: "@scope/pkg3",
            version: "1.0.0",
            main: "index.js",
            exports: {
                "./frontend": "./lib/frontend/index.js"
            },
            pgYaml: "id: pkg3\ntype: plugin",
            localSettings: "a: 2\nb: value"
        };

        // regular package with localSettings and env/profiles
        const PKG4 = {
            name: "pkg4",
            version: "1.0.0",
            main: "index.js",
            exports: {
                "./frontend": "./lib/frontend/index.js"
            },
            pgYaml: "id: pkg4\ntype: plugin",
            localSettings: "a: 2\nb: value",
            envSettings: {
                local: "a: 3"
            },
            profileSettings: {
                dev: "b: value2"
            }
        };

        // regular scoped package with localSettings and env/profiles
        const PKG5 = {
            name: "@scope/pkg5",
            version: "1.0.0",
            main: "index.js",
            exports: {
                "./frontend": "./lib/frontend/index.js"
            },
            pgYaml: "id: pkg5\ntype: plugin",
            localSettings: "a: 2\nb: value",
            envSettings: {
                local: "a: 3",
                local2: "a: 4"
            },
            profileSettings: {
                dev: "b: value2",
                prod: "b: value3"
            }
        };

        it("correct answer with all packages", () => {

            const ans = buildProjectFs({
                packagesInfo: [PKG0, PKG1, PKG2, PKG3, PKG4, PKG5],
                packageJson: {
                    name: "pg-project",
                    version: "1.2.3"
                },
                pgYaml: "type: project"
            });

            expect(ans).to.deep.equal({
                "pg.yaml": "type: project",
                "package.json": JSON.stringify({
                    name: "pg-project",
                    type: "module",
                    version: "1.2.3",
                    dependencies: {
                        "pkg0": "0.0.0",
                        "pkg1": "0.0.0",
                        "pkg2": "1.0.0",
                        "@scope/pkg3": "1.0.0",
                        "pkg4": "1.0.0",
                        "@scope/pkg5": "1.0.0"
                    }
                }),
                "data": {
                    "pkg2": {
                        "settings.yaml": "a: 2\nb: value"
                    },
                    "pkg4": {
                        "settings.yaml": "a: 2\nb: value"
                    },
                    "@scope": {
                        "pkg3": {
                            "settings.yaml": "a: 2\nb: value"
                        },
                        "pkg5": {
                            "settings.yaml": "a: 2\nb: value"
                        }
                    },
                    "--envs": {
                        "local.yaml": "\"pkg4\":\n  a: 3\n\"@scope/pkg5\":\n  a: 3\n",
                        "local2.yaml": "\"@scope/pkg5\":\n  a: 4\n"
                    },
                    "--profiles": {
                        "dev.yaml": "\"pkg4\":\n  b: value2\n\"@scope/pkg5\":\n  b: value2\n",
                        "prod.yaml": "\"@scope/pkg5\":\n  b: value3\n"
                    }
                },
                "node_modules": {
                    "pkg0": {
                        "package.json": JSON.stringify({
                            name: "pkg0",
                            type: "module"
                        })
                    },
                    "pkg1": {
                        "package.json": JSON.stringify({
                            name: "pkg1",
                            type: "module"
                        }),
                        "pg.yaml": "id: pkg1\ntype: plugin"
                    },
                    "pkg2": {
                        "package.json": JSON.stringify({
                            name: "pkg2",
                            version: "1.0.0",
                            main: "index.js",
                            exports: {
                                "./frontend": "./lib/frontend/index.js"
                            },
                            type: "module"
                        }),
                        "pg.yaml": "id: pkg2\ntype: plugin"
                    },
                    "pkg4": {
                        "package.json": JSON.stringify({
                            name: "pkg4",
                            version: "1.0.0",
                            main: "index.js",
                            exports: {
                                "./frontend": "./lib/frontend/index.js"
                            },
                            type: "module"
                        }),
                        "pg.yaml": "id: pkg4\ntype: plugin"
                    },
                    "@scope": {
                        "pkg3": {
                            "package.json": JSON.stringify({
                                name: "@scope/pkg3",
                                version: "1.0.0",
                                main: "index.js",
                                exports: {
                                    "./frontend": "./lib/frontend/index.js"
                                },
                                type: "module"
                            }),
                            "pg.yaml": "id: pkg3\ntype: plugin"
                        },
                        "pkg5": {
                            "package.json": JSON.stringify({
                                name: "@scope/pkg5",
                                version: "1.0.0",
                                main: "index.js",
                                exports: {
                                    "./frontend": "./lib/frontend/index.js"
                                },
                                type: "module"
                            }),
                            "pg.yaml": "id: pkg5\ntype: plugin"
                        }
                    }
                }
            });

        });

        it("correct answer with no packages and all default project values", () => {

            const ans = buildProjectFs();
            expect(ans).to.deep.equal({
                "package.json": JSON.stringify({
                    name: "pg-project",
                    type: "module"
                }),
                "data": {}
            });

        });

    });

});