"use strict";
const sqltt = require("../");

// const prm = [ // If columns and parameter names match:
//   'company_name',
//   'company_dept',
// ];
const prm = { // ...otherwise:
    cn: 'company_name',
    cd: 'company_dept',
    sector: true,
};

const q = new sqltt({
    sql: /* @@sql@@ */ $=>$`
        select *
        from users
        where ${$.entries(prm, 'and')}
    `, /* @@/sql@@ */
});


sqltt.publish(module, q);

