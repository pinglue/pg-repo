import {expect} from "chai";

import {filterMatch} from "./filter-match.js";

describe("util filterMatch", () => {

    it("should show the corrent answer when pattern is substring of target", () => {

        const ans = filterMatch("@pinglue/mongodb-pl", "mongodb");
        expect(ans).to.be.true;

    });

    it("should show the corrent answer when pattern is not a substring of target", () => {

        const ans = filterMatch("@pinglue/mongodb-pl", "mongodb123");
        expect(ans).to.be.false;

    });

    it("should show the corrent answer when pattern is the same as the target", () => {

        const ans = filterMatch("@pinglue/mongodb-pl", "@pinglue/mongodb-pl");
        expect(ans).to.be.true;

    });

    it("should show the corrent answer when pattern is nullish", () => {

        let ans = filterMatch("@pinglue/mongodb-pl", "");
        expect(ans).to.be.true;
        ans = filterMatch("@pinglue/mongodb-pl");
        expect(ans).to.be.true;
        ans = filterMatch("@pinglue/mongodb-pl", null);
        expect(ans).to.be.true;

    });

});