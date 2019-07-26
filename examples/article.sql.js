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


const fieldsArr = ['sectionId', 'title', 'body'];
q.insert = new sqltt({
    description: "Perform an Insert.",
    args: ["title", "body", "sectionId"],
    sql: /* @@sql@@ */ $=>$`
        insert into articles (${$.keys(fieldsArr)})
        values (${$.values(fieldsArr)})
    `, /* @@/sql@@ */
});


const fieldsObj = {sectionId: 'sectionId', title: 'title', body: 'contents'};
q.update = new sqltt({
    description: "Perform an update.",
    args: {
        "id": "Identifier",
        "title": "Main title",
        "contents": "Article contents",
        "sectionId": "Related section id",
    },
    sql: /* @@sql@@ */ $=>$`
        update articles set ${$.entries(fieldsObj)}
        where id = ${"id"}
    `, /* @@/sql@@ */
});

sqltt.publish(module, q);

