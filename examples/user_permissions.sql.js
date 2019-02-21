"use strict";
const sqlst = require("../");

const q = new sqlst($ => ({
    args: ["priv_type"],
        // Let's force (not necessarily all) parameters order.
    sql: $`
        --@@sql@@
        with users as (
            ${require("./users.sql.js")}
        )
        select *
        from users
        join privileges using (user_id)
        where privilege_type = ${"priv_type"}
        --@@/sql@@
    `,
}));


module.exports = q;

module.parent || console.log(q.sql('cli'));

