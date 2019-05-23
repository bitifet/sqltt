"use strict";
const sqltt = require("../");

const q = new sqltt({
    sql: /* @@sql@@ */ $=>$`
        select *
        from users
        where company_name = ${"company_name"}
        and company_dept = ${"company_dept"}
    `, /* @@/sql@@ */
});


sqltt.publish(module, q);

