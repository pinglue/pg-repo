
import type {
    PgModuleMessenger
} from "@pinglue/utils";

import {Msg} from "@pinglue/utils";

import {Controller} from "../controller.js";

import type {CtAuth} from "./index";

// =============================================

interface Settings {
    __log: PgModuleMessenger;
}

type RegistryInfo = {
    hash: number;
    controller: Controller;
};

export class ControllerManager {

    /**
	 * The record of registered controllers
	 */
    #registry = new Map<string, RegistryInfo>();

    /**
	 * logger
	 */
    #log: PgModuleMessenger;

    constructor(settings: Settings) {

        this.#log = settings.__log;

    }

    /**
	 * decides if the provided auth is valid for the registered controller.
	 * @param ctAuth
	 * @throws [[Result]] if auth fails
	 */
    public auth(ctAuth: CtAuth): void {

        if (!this.#registry.has(ctAuth.id)) {

            this.#log.error("Invalid controller id", ctAuth);
            throw Msg.security("sec-invalid-id", {
                ctAuth
            });

        }

        if (this.#registry.get(ctAuth.id).hash !== ctAuth.hash) {

            this.#log.error("Invalid hash", ctAuth);
            throw Msg.security("sec-invalid-hash", {
                ctAuth
            });

        }

    }

    /**
	 * registering a controller with the given id and instance. DOES NOT run the controller's registerCallback method
	 * @param id controller id
	 * @param controller controller instance
	 * @return if registration is successful returns ctAuth (ControllerAuth) info
	 * @throws [[Result]] if error (like controller already exists)
	 */
    public register(
        id: string | undefined,
        controller: Controller,
        options: {flexId?: boolean} = {}
    ): {ctAuth: CtAuth} {

        if (!id || this.#registry.has(id)) {

            if (!options.flexId) {

                if (id) {

                    this.#log.security(
                        `Controller cannot be registered for another controller with teh same id already exists! (id: ${id})`,
                        {id}
                    );
                    throw Msg.security(
                        "sec-controller-double-register"
                    );

                }
                else {

                    this.#log.error("err-empty-id");
                    throw Msg.error("err-empty-id");

                }

            }
            // changing the id by trailing some hash
            else {

                let x = 2;

                if (!id) {

                    id = "ct";
                    x = 1;

                }

                let newId;
                for(
                    newId = _modifyId(id, x);
                    this.#registry.has(newId);
                    x++, newId = _modifyId(id, x)
                );

                this.#log("msg-ct-id-change", {
                    id,
                    newId
                });

                id = newId;

            }

        }

        const hash = this.genHash({id});
        this.#registry.set(id, {hash, controller});
        return {
            ctAuth: {id, hash}
        };

    }

    public removeController(controllerId: string): void {

        this.#registry.delete(controllerId);

    }

    private genHash(seed: {id: string}): number {

        return Math.round(Math.random() * 1000000);

    }

    /**
	 * Runs the init callback method of all the controllers in parallel (Promise.all). It caught the exceptions and log
	 */
    public async initAll(): Promise<void> {

        const inits = [...this.#registry].map(
            async([id, info]) =>
                info.controller
                    .initCallback()
                    .catch((error) => {

                        this.#log.error(
                            `Exception in the init method of controller "${id}"`,
                            error
                        );

                    })
        );
        await Promise.all(inits);

    }

    /**
	 * Runs the start callback method of all the controllers in parallel (Promise.all). It caught the exceptions and log
	 */
    public async startAll(): Promise<void> {

        const starts = [...this.#registry].map(
            async([id, info]) =>
                info.controller
                    .startCallback()
                    .catch((error) => {

                        this.#log.error(
                            `Exception in the start method of controller "${id}"`,
                            error
                        );

                    })
        );

        await Promise.all(starts);

    }

}

/* aux functions
==================== */

const _modifyId = (id: string, index: number) =>
    `(#${index})${id}`;