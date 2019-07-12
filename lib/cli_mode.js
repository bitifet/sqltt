// lib/cli_mode.js
// ===============
"use strict";
const D = require("./definitions");
const engine = require("./engines");

function logQuery(sqltt, qSrc, args, eng) {// CLI output helper {{{
    // Accept single query template or Array
    let qList = qSrc instanceof Array
        ? qSrc
        : [qSrc]
    ;
    D.console.log (
        qList
            .map(function(q) {
                if (! (q instanceof sqltt)) throw "Not a sqltt instance.";
                return [
                    eng.argWrapper.bind(q)(args),
                    q.sql('cli'),
                ].join("\n");
            })
            .join("\n;\n")
    );
};//}}}

module.exports = function cli_mode(qSrc) {

    const sqltt = this;
    const eng = engine.resolve(null, 'cli');
    const args = process.argv.slice(2); // Get shell arguments.

    if (qSrc instanceof sqltt) {
        logQuery(sqltt, qSrc, args, eng);
    } else {
        const qId = args.shift()        // Extract first as query id.
        if ( // Unexistent query or unspecified.{{{
            ! qId || ! qSrc[qId]
        )//}}}
        { // then - List available ones:{{{
            D.console.log ("Available queries: " + Object.keys(qSrc).join(", "));
        }//}}}
        else if ( // Regular object{{{
            Object.getPrototypeOf(qSrc[qId]) === D.proto_object
        )//}}}
        { // then - Threat simple objects as exported datasets:{{{
            D.console.log(
                (
                    "\n"
                    + String(
                        qId + ' ' + JSON.stringify(qSrc[qId], null, 4)
                    )
                )
                .replace(/\n/g, "\n-- ")
                .trim()
            );
        }//}}}
        else
        { // Render selected query:{{{
            logQuery(sqltt, qSrc[qId], args, eng);
        };//}}}
    };
};
