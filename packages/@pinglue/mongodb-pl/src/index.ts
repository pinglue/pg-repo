
import {Collection, Db, MongoClient} from "mongodb";
import {Controller} from "pinglue";
import {Msg} from "@pinglue/utils";

type Settings = {
    dbName: string;
    host: string;
    port: number;
    username: string;
    password: string;
    queryString: string;
    driverOptions: Object;
};

type GetColParams = {
    name: string;
    exact?: boolean;
};

export default class extends Controller {

    protected settings: Settings;

    db: Db;

    /**
     * Throws if db connection fails
     */
    async init() {

        await this.connect();

        // gluings
        this.glue("get-mongodb-collection",
            this.getColHandler.bind(this));

    }

    /**
     *
     * @param params
     * @param _
     * @param meta
     * @returns
     * @throws
     */
    private async getColHandler(
        params: GetColParams, _,
        meta
    ): Promise<Collection> {

        return this.getCollection(meta.runner, params);

    }

    /**
     * Connecting to the db, logs error if failed
     * @throws if connection fails
     */
    private async connect(): Promise<void> {

        if (!this.settings.dbName || !this.settings.dbName.trim()) {

            this.log.error("err-empty-dbname");
            throw Msg.error("err-empty-dbname");

        }

        // building connection string
        let upStr = "";

        if (
            this.settings.username &&
            this.settings.password
        ) {

            upStr = `${this.settings.username}:${this.settings.password}@`;

        }

        const conStr = `mongodb://${upStr}${this.settings.host}:${this.settings.port}/${this.settings.dbName}${this.settings.queryString ? "?" + this.settings.queryString : ""}`;

        try {

            const client: MongoClient = new MongoClient(
                conStr,
                this.settings.driverOptions || {}
            );

            await client.connect();

            // check if the given db exists if not issue a warning
            const dbsList = await client.db().admin().listDatabases();

            // @ts-ignore
            const temp = dbsList.databases.find((item) => item.name === this.settings.dbName);

            if (!temp) {

                this.log.warn(`Database ${this.settings.dbName} does not exists! But it will be created`);

            }

            // get the db object
            this.db = client.db(this.settings.dbName);
            this.log.success("Connected to MongoDB");

        }
        catch (error) {

            this.log.error("Connection to MongoDB failed!", error);
            throw Msg.error("err-db-connection-failed");

        }

    }

    /**
     * return a collection to be used by a controller. Here security checks take place.
     *
     * @throws [[PgError]] If the operation failes (either due to db connection issues or security)
     */
    private async getCollection(
        controllerId: string,
        params: GetColParams
    ): Promise<Collection> {

        // TODO: security checks if this controller can access this collection - for now we grant all accesses
        // TODO: resiliant, lie try to re-connect if connection was lost

        const name = (params.exact) ?
            params.name :
            `${controllerId}/${params.name}`;

        this.log("msg-mongodb-col-request", {
            collectionName: name,
            controllerId
        });

        if (!this.db) {

            throw Msg.error("err-db-not-initialized");

        }

        try {

            return this.db.collection(name);

        }
        catch (err) {

            throw Msg.error("err-collection-not-available");

        }

    }

}
