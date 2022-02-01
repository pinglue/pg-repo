
import {Controller} from "pinglue";

export default class extends Controller {

    async init() {

        this.mark("Hello world!");

        // Glue some handler:
        // this.glue("channel-name", channelNameHandler.bind(this))

    }

    /*
    async channelNameHandler(params, value) {
        // Do something
    }*/

    async start() {

        // Run a channel:
        // await this.runA("channel-name", params, value)

    }
    
}
