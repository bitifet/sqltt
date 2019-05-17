"use strict";

const engines = {};

// Regular Engines:
// ================

engines.default = {//{{{
    indexer: i=>('$'+i),
    argsRenderer: args=>args,
    wrapper: s=>s,
    alias: a=>"as "+a,
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
        alias: a=>a,
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

engines.cli = Object.assign (//{{{
    {}
    , engines.default
    , {
        indexer: (i,n)=>':'+n,
        argsRenderer: function(args) {
            console.log ("@@@@@@@@@@@@@");
            const me = this;
            return me.argList.map(function(argName, i) {
                return "\\set "+argName+" '''"+(args[1] || "")+"'''";
            }).join("\n");
        },
        // wrapper: function(sql, args) {//{{{
        //     const me = this;
        //     return me.argList.map(
        //             (a,i)=>"\\set "+a+" '''"+(args[i] || "")+"'''"
        //         ).join("\n")
        //         + sql
        //     ;
        // },//}}}
    }
);//}}}

engines.postgresql_cli = Object.assign (//{{{
    {}
    , engines.cli
);//}}}

module.exports = engines;
