// article.sql.js
// ==============
// (Query compilation example)
"use strict";
const sqltt = require("../");

const q = {                // Define multiple named query templates.
    list: new sqltt( /* @@sql@@ */ `
            select id, sectionName, title
            from articles
            join sections using(sectionId)
    ` /* @@/sql@@ */),
    listBySection: new sqltt( /* @@sql@@ */ $=>$`
            select id, sectionName, title
            from articles
            join sections using(sectionId)
            where sectionId = ${$.arg("sectionId")}
    ` /* @@/sql@@ */),
    show: new sqltt( /* @@sql@@ */ $=>$`
            select id, sectionName, title, body
            from articles
            join sections using(sectionId)
            where id = ${"id"}
    ` /* @@/sql@@ */),
    create: new sqltt( /* @@sql@@ */ $=>$`
            insert into articles (sectionId, title, body)
            values (${"sectionId"}, ${"title"}, ${"body"})
    ` /* @@/sql@@ */),
}

sqltt.publish(module, q);

