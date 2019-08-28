// lib/cli_mode.js
// ===============
"use strict";
const Chalk = require("chalk");
const D = require("./definitions");
const _priv_ = D.sym_private;
const hlp = require("./helpers");
const engine = require("./engines");

function parseCliArguments(args, parseCmd) {//{{{
    const cliModifiers = {};
    const cliArguments = [];
    let cmd = undefined;
    let mutations = undefined;
    let acceptModifers = true;

    args.map(function(arg){//{{{
        if (arg == '-') return acceptModifiers = false;
        let [modif, modifVal] = (arg.match(D.re_longModifier) || []).slice(1);
        if (modif) return cliModifiers[modif] = modifVal || true;
        if (arg.toLowerCase() == 'null') return cliArguments.push(null);
            // For literal null, quotes are required.
        if (arg.toLowerCase() == 'true') return cliArguments.push(true);
        if (arg.toLowerCase() == 'false') return cliArguments.push(false);
        const q = arg.substring(0,1);
        if (
            ('\'"'.indexOf(q) >= 0) // Is «'» or «"»
            && q == arg.substring(q.length-1, q.length) // Is surrounded
        ) {
            arg = arg
                .substring(1, arg.length-1) // Remove surrounding quotes.
                .split("\\"+q).join(q)    // Unescape quoting character.
                               // (Non escaped will be accepted as well)
            ;
        } else if (! isNaN(arg)) {
            arg = Number(arg);
        };
        cliArguments.push(arg);
    });//}}}

    if (
        parseCmd
        && (cmd = cliArguments.shift() || cmd) // Preserve default (null) if unspecified
    ) {
        [cmd, mutations] = (cmd.match(D.re_fnLikeArgs) || [null, cmd, ""]).slice(1);
        if (! mutations.length) {
            mutations = undefined;
        } else if (! mutations.match(D.re_isValidNameList)) {
            mutations = hlp.customError(
                "Malformed JSON"
                , hlp.parseJSON
                , mutations
            );
        };
    };

    return [cmd, mutations, cliArguments, cliModifiers];

};//}}}

function logQuery(sqltt, qSrc, mutations, args) {// CLI output helper {{{
    // Accept single query template or Array
    let qList = qSrc instanceof Array
        ? qSrc
        : [qSrc]
    ;
    D.console.log (
        qList
            .map(function(q) {
                if (! (q instanceof sqltt)) throw "Not a sqltt instance.";
                if (mutations !== undefined) q = q.data(mutations);
                const eng = engine.resolve(q, 'cli');

                return [
                    hlp.softBind(eng.argWrapper, q)(args),
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
                var debug = !! q.find(subq=>subq[_priv_].options.debug);
            } else {
                var description = (q.getSource().description || "").trim();
                var debug = q[_priv_].options.debug;
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
    const multiple = ! (qSrc instanceof sqltt);
    const [qId, mutations, args, modifiers] = parseCliArguments(
        process.argv.slice(2) // Get shell arguments.
        , multiple
    );

    if (! multiple) {
        logQuery(sqltt, qSrc, mutations, args);
    } else {
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
            logQuery(sqltt, qSrc[qId], mutations, args);
        };//}}}
    };
};

