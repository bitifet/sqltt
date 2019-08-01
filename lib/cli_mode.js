// lib/cli_mode.js
// ===============
"use strict";
const Chalk = require("chalk");
const D = require("./definitions");
const engine = require("./engines");

function logQuery(sqltt, qSrc, args) {// CLI output helper {{{
    // Accept single query template or Array
    let qList = qSrc instanceof Array
        ? qSrc
        : [qSrc]
    ;
    D.console.log (
        qList
            .map(function(q) {
                if (! (q instanceof sqltt)) throw "Not a sqltt instance.";
                const eng = engine.resolve(q, 'cli');

                return [
                    eng.argWrapper.bind(q)(args),
                    q.sql('cli'),
                ].join("\n");
            })
            .join("\n;\n")
    );
};//}}}

function listQueries(qList) {//{{{
    return [Chalk.bold.blue("Available queries:")]
        .concat(qList.map(function([name, q]) {
            const flags = [];
            if (q instanceof Array) {
                flags.push("Multiquery"); // This is an edge case for hard situations with oracle
                const descripted = q.find(subq=>subq.getSource().description);
                var description = descripted ? descripted.getSource().description : "";
                var debug = !! q.find(subq=>subq[D.sym_options].debug);
            } else {
                var description = (q.getSource().description || "").trim();
                var debug = q[D.sym_options].debug;
            };
            if (! description.length) flags.push("Undocumented");
            if (debug) flags.push(Chalk.red("Debug Enabled"));
            return Chalk.green('  ✓ ')
                + Chalk.yellow(name + ": ")
                + description
                + (flags.length ? Chalk.gray(
                    " (" + flags.join(", ") + ")"
                ) : "")
            ;
        }))
        .join("\n")
    ;
};//}}}

module.exports = function cli_mode(qSrc) {

    const sqltt = this;
    const args = process.argv.slice(2); // Get shell arguments.

    if (qSrc instanceof sqltt) {
        logQuery(sqltt, qSrc, args);
    } else {
        const qId = args.shift()        // Extract first as query id.
        if ( // Unexistent query or unspecified.{{{
            ! qId || ! qSrc[qId]
        )//}}}
        { // then - List available ones:{{{
            D.console.log (listQueries(Object.entries(qSrc)));
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
            logQuery(sqltt, qSrc[qId], args);
        };//}}}
    };
};

