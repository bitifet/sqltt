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


q.insert = new sqltt({
    name: "ArticleInsert",
    description: "Perform an Insert.",
    args: ["title", "body", "sectionId"],
    data: {
        columns: ['sectionId', 'title', 'body'],
    },
    sql: /* @@sql@@ */ $=>$`
        insert into articles (${$.keys($.data('columns'))})
        values (${$.values($.data('columns'))})
    `, /* @@/sql@@ */
}, {debug: true});


q.update = new sqltt({
    description: "Perform an update.",
    args: {
        "id": "Identifier",
        "title": "Main title",
        "contents": "Article contents",
        "sectionId": "Related section id",
    },
    data: {
        columns: {sectionId: 'sectionId', title: 'title', body: 'contents'},
    },
    sql: /* @@sql@@ */ $=>$`
        update articles set ${$.entries($.data('columns'))}
        where id = ${"id"}
    `, /* @@/sql@@ */
});

sqltt.publish(module, q /*, {debug: true}*/);

