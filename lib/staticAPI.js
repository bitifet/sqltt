// lib/staticAPI.js
// ================
"use strict";
const D = require("./definitions");
const isCli = m=>(! m.parent || D.emulateCli);

module.exports = {
    version: D.version,
    publish(module, qSrc, options) {//{{{
        const sqltt = this;

        const cliMode = (...args)=>require("./cli_mode").bind(sqltt)(...args);

        // Allow to use global options specially for multi-template files:
        if (options !== undefined) {
            if (qSrc instanceof sqltt) {
                qSrc = qSrc.options(options);
            } else {
                Object.keys(qSrc).map(function(key) {
                    return qSrc[key]=qSrc[key] instanceof Array
                        ? qSrc[key].map(q=>q.options(options))
                        : qSrc[key].options(options)
                    ;
                });
            };
        };

        // NOTE:
        // Arrays of templates are allowed in order to specify multiple queries
        // expected to execute in single transaction. Specially in databases
        // like Oracle which doesn't support complex CTE's.

        // Export for library usage:
        module.exports = qSrc;

        // CLI usage:
        if (isCli(module)) cliMode(qSrc);

    },//}}}
};
