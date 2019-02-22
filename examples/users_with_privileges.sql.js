"use strict";
const sqlst = require("../");

const q = new sqlst($ => ({
    sql: $`
        --@@sql@@
        with usersCte as (
            ${
                // Include another query:
                require("./users.sql.js")
            }
        )
        select *
        from usersCte
        join (
            ${
                // Include another query and fill some arguments:
                [require("./privileges.sql.js"), {privilege_name: "'login'"}]
            }
        ) as loggeableUsers
        --@@/sql@@
    `,
}));


module.exports = q;

module.parent || console.log(q.sql('cli'));

