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

console.log(q.args('cli'));

if (! module.parent) {
    const r = q.setEngine('cli', process.argv.slice(2));
    console.log(r.args(process.argv.slice(2)));
    console.log("------------------");
    console.log(r.sql());
};


