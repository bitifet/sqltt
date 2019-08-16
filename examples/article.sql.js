// article.sql.js
// ==============
// (Query compilation example)
"use strict";
const sqltt = require("../"); // sqltt

// Define multiple named query templates.
const q = {};

q.list = new sqltt({
    data: {
        columns: ["id", "sectionName", "title"],
    },
    presets: {
        detailed: {columns: ["id", "sectionName", "title", "autor", "brief", "ctime", "mtime"]},
        bySection: {filters: ["sectionId"]},
    },
    sql: /* @@sql@@ */ $=>$`
        select ${$.data("columns")}
        from articles
        join sections using(sectionId)
        ${$.entries($.data("filters"), "and", "where")}
    `, /* @@/sql@@ */
})

// q.listDetailed = q.list
//     .data({
//         columns: ["id", "sectionName", "title", "autor", "brief", "ctime", "mtime"],
//     })
// ;

q.listDetailed = q.list.data("detailed");
q.listBySection = q.list.data("bySection");
q.listDetailedBySection = q.list.data("detailed, bySection");



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
        ${$.values($.data('columns'), ', ', "values (%)")}
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
        update articles ${$.entries($.data('columns'), undefined, 'set')}
        where id = ${"id"}
    `, /* @@/sql@@ */
});

sqltt.publish(module, q /*, {debug: true}*/);

