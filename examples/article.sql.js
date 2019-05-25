// article.sql.js
// ==============
// (Query compilation example)
"use strict";
const sqltt = require("../"); // sqltt

// Define multiple named query templates.
const q = {};

q.list = new sqltt( /* @@sql@@ */ `
    select id, sectionName, title
    from articles
    join sections using(sectionId)
` /* @@/sql@@ */);

q.listBySection = new sqltt( /* @@sql@@ */ $=>$`
    ${$.include(q.list)}
    where sectionId = ${$.arg("sectionId")}
` /* @@/sql@@ */);

q.show = new sqltt( /* @@sql@@ */ $=>$`
    select id, sectionName, title, body
    from articles
    join sections using(sectionId)
    where id = ${"id"}
` /* @@/sql@@ */);

const fields = ['sectionId', 'title', 'body'];
q.insert = new sqltt( /* @@sql@@ */ $=>$`
    insert into articles (${$.keys(fields)})
    values (${$.values(fields)})
` /* @@/sql@@ */);

q.update = new sqltt( /* @@sql@@ */ $=>$`
    update articles set ${$.entries(fields)}
    where id = ${"id"}
` /* @@/sql@@ */);

sqltt.publish(module, q);

