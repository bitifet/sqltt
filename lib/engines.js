"use strict";
const D = require("./definitions");
const _priv_ = D.sym_private;

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
        sqlWrapper: sql=>sql.replace(/\n+\s*\n+/g, "\n"),
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
            return me.argList.map(function(a,i) {
                const rendered = (
                    typeof args[i] == 'number' ? args[i]
                    : args[i] === true ? 'TRUE'
                    : args[i] === false ? 'FALSE'
                    : args[i] === null ? 'NULL'
                    : "'''"+(args[i] || "")+"'''"
                );
                return "\\set "+a+" " + rendered;
            }).join("\n")
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
        sqlWrapper: sql=>engines.oracle.sqlWrapper(sql)+";",
        argWrapper: function(args) {//{{{
            const me = this;
            return me.argList.map(function(a,i) {
                const rendered = (
                    typeof args[i] == 'number' ? args[i]
                    : args[i] === true ? 'TRUE'
                    : args[i] === false ? 'FALSE'
                    : args[i] === null ? 'NULL'
                    : "'"+(args[i] || "")+"'"
                );
                return "define "+a+" = " + rendered;
            }).join("\n")
            ;
        },//}}}

    }
);//}}}

// ------------------------------------------------------------------------------------

const validEngines = (function() {//{{{
    const ve = Object.keys(engines);
    ve.map(
        e=>e.match(D.re_cli) || ve.push(e+"_nocli")
    );
    ve.push('cli', 'nocli');
    return ve;
})();//}}}

const re_isValidEngine = new RegExp(//{{{
    "^(?:" + validEngines.join("|") + ")$"
);//}}}

function patch_name(...names) {//{{{
    let flavour = "";
    let cli = "";
    names.map(function(name) {
        const [newFlavour, changeCli] = (name || "").match(D.re_fulleng).slice(1);
        if (newFlavour) flavour = newFlavour;
        if (changeCli) cli = changeCli;
    });
    const retv = (
        flavour && cli ? flavour + "_" + cli
        : flavour+cli
    );
    return retv;
};//}}}

function resolve(me, engName0 = "") {//{{{

    let isCli = false;

    const [
        tplDefault,
        engName,
        envDefault,
    ] = [
        (((me || {})[_priv_] || {}).options || {}).default_engine,
        engName0,
        process.env[D.engine_env_var],
    ]
        .map(function update_isCli(str) {
            const m = (str || "").match(D.re_cli);
            if (m) isCli = m[1] == "cli";
            return str; // Pass through
        })
        .map(function pickFlavour(str) {
            return (str||"").replace(D.re_cli, "")
        })
    ;

    const flavour = engName || envDefault || tplDefault || "default";
    let name = isCli
        ? flavour+"_cli"
        : flavour.replace(D.re_cli, "")
    ;

    if (isCli && ! engines[name]) {
        D.console.error(
            "-- Unknown/Unimplemented cli engine: "
            + name
            + ". Using default..."
        );
        name = "default_cli";
    };

    const eng = engines[name];
    if (! eng) throw new Error ("Unknown database engine: " + name);

    return Object.assign({
        name,
        flavour,
    }, eng);

};//}}}

module.exports = {
    resolve,
    validEngines,
    re_isValidEngine,
    patch_name,
};
