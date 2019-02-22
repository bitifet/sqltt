"use strict";

const engines = {};

// Regular Engines:
// ================

engines.default = {//{{{
    indexer: i=>('$'+i),
    wrapper: s=>s,
};//}}}

engines.postgresql = Object.assign (//{{{
    {}
    , engines.default
);//}}}

engines.oracle = Object.assign (//{{{
    {}
    , engines.default
    , {
        indexer: i=>(':'+i),
    },
);//}}}

// CLI Engines:
// ============

// WARNING: CLI Engines aren't actually intended to be used in normal
// operation.
//
// Their only purpose is to allow us to implement query files that can be both
// required as a library and directly executed from console and piped to our
// database interpreter. 
//
// EXAMPLE:
//
//   const sqlst = require("sqlst");
//   const q = new sqlst($ => ({
//       args: [...],
//       sql: $`
//           -- (SQL Query)
//       `,
//   }));
//   module.exports = q;
//   module.parent || console.log(q.sql('cli'));
//
// USAGE EXAMPLE:
//
// $ node some_query.sql.js --postgres arg1 arg2 | psql myDatabase

var cliArgs
    , cliEngine
    , targetCliEngine
;

engines.cli = Object.assign (//{{{
    {}
    , engines.default
    , {
        indexer: function (i,n) {
            if (! cliArgs) {
                cliArgs = process.argv.slice(2);
                cliEngine = (
                    (cliArgs[0] || "").match(/^--(\w+)$/)
                    || []
                )[1];
                if (cliEngine) {
                    cliArgs.shift();
                    if (cliEngine == 'default') {
                        cliEngine = ''; // Deactivate.
                    } else {
                        targetCliEngine = engines[cliEngine+"cli"];
                        if (! targetCliEngine) {
                            console.error("-- Unknown/Unimplemented cli engine: " + cliEngine + ". Using default...");
                            cliEngine = ''; // Deactivate.
                        };
                    };
                };
            };
            if (
                cliEngine
                && ! Object.is(targetCliEngine.indexer, engines.cli.indexer)
            ) return targetCliEngine.indexer(i, n);
            return ':'+n;
        },
        wrapper: function(sql) {
            const me = this;

            if (
                cliEngine
                && ! Object.is(targetCliEngine.wrapper, engines.cli.wrapper)
            ) return targetCliEngine.wrapper.call(me, sql);

            // Actual wrapper implementation:
            return me.argList.map(
                    (a,i)=>"\\set "+a+" '''"+(cliArgs[i] || "")+"'''"
                ).join("\n")
                + sql
            ;

        },
    }
);//}}}

engines.postgresqlcli = Object.assign (//{{{
    {}
    , engines.cli
);//}}}

module.exports = engines;
