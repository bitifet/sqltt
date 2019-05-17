"use strict";
const sqltt = require("../");

const q = new sqltt({
    sql: $=>$`
        --@@sql@@
        with usersCte as (
            ${
                // Include another query:
                $.include(require("./users.sql.js"))
            }
        )
        select *
        from usersCte
        join (
            ${
                // Include another query and fill some arguments:
                $.include(require("./privileges.sql.js"), {privilege_name: "'login'"})
            }
        ) as loggeableUsers
        --@@/sql@@
    `,
});


module.exports = q;

module.parent || console.log(q.sql('cli', process.argv.slice(2) ));

