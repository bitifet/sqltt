"use strict";
const sqlst = require("../");

const q = new sqlst($ => ({
    sql: $`
        --@@sql@@
        select *
        from privileges
        where user_id = ${"user_id"}
        and privilege_name = ${"privilege_name"}
        --@@/sql@@
    `,
}));


module.exports = q;

module.parent || console.log(q.sql('cli'));

