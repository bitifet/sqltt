// article.sql.js
// ==============
// (Query compilation example)
"use strict";
const sqltt = require("../");

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

q.create = new sqltt( /* @@sql@@ */ $=>$`
    insert into articles (sectionId, title, body)
    values (${"sectionId"}, ${"title"}, ${"body"})
` /* @@/sql@@ */);

sqltt.publish(module, q);

