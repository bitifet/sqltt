"use strict";

const engines = {};

// Regular Engines:
// ================

engines.default = {//{{{
    indexer: i=>('$'+i),
    sqlWrapper: sql=>sql,
    argWrapper: args=>"",
    alias: alias=>"as "+alias,
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
        alias: alias=>alias,
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

engines.default_cli = Object.assign (//{{{
    {}
    , engines.default
    , {
        indexer: (i,n)=>':'+n,
        argWrapper: function(args) {//{{{
            const me = this;
            return me.argList.map(
                    (a,i)=>"\\set "+a+" '''"+(args[i] || "")+"'''"
                ).join("\n")
            ;
        },//}}}
    }
);//}}}

engines.postgresql_cli = Object.assign (//{{{
    {}
    , engines.default_cli
);//}}}

engines.oracle_cli = Object.assign (//{{{
    {}
    , engines.oracle
    , {
        indexer: (i,n)=>"'&"+n+"'",
        sqlWrapper: sql=>sql+";",
        argWrapper: function(args) {//{{{
            const me = this;
            return me.argList.map(
                    (a,i)=>"define "+a+" = '"+(args[i] || "")+"'"
                ).join("\n")
            ;
        },//}}}

    }
);//}}}

module.exports = engines;
