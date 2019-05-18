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

module.exports = q;                      // Exports it.
if (! module.parent) {
    const args = process.argv.slice(2);  // Get shell arguments.
    const qId = args.shift()             // Extract first as query id.
    console.log (qId
        ?  q[qId].sql('cli', args)       // Render query if selected
        : "Available queries: " + Object.keys(q).join(", ")
    );  // ...and provide available queries list if no argument provided.
};

