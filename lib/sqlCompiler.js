// lib/sqlCompiler.js
// ==================
"use strict";
const interpolation = require("./interpolation");
const Compiler = require("./compilerClass");

function hookApply(me, engName, arg, rarg) {//{{{
    const hook = me.hooks[arg];
    if (! hook) return rarg;
    const hookt = typeof hook;
    if (hookt == "function") return hook(rarg, engName) || rarg;
    if (hookt == "string") return hook.replace(/%/g, rarg);
    throw new Error ("Invalid hook type: " + hookt);
};//}}}

const lib = {
    arg(argName) {//{{{
        const me = this;
        if (argName instanceof Array) return argName.map(s=>me.arg(s).wrap());
        return new interpolation (
            hookApply (
                me.target
                , me.eng.name
                , argName
                , me.literals[argName] === undefined
                    ? me.eng.indexer(me.target.argIdx[argName], argName)
                    : me.literals[argName]
            )
        );
    },//}}}
    literal(str) {//{{{
        const me = this;
        if (str instanceof Array) return str.map(s=>me.literal(s).wrap());
        return new interpolation (
            hookApply(me.target, me.eng.name, str, str)
        );
    },//}}}
    include(src, bindings = {}) {//{{{
        const me = this;
        if (src instanceof Array) return src
            .map(me.src2tpl)
            .map(
                s=>me
                    .include(s, bindings)
                    .wrap(me.eng.alias(s.getSource().alias))
            )
        ;
        src = me.src2tpl(src);

        return new interpolation (
            src.getSource(me.eng.flavour).sql(
                new me.constructor(me.target, me.eng, bindings)
            )
        );
    },//}}}
    arr(inArr) {//{{{
        return inArr.join(", ");
    },//}}}
};

function finishCbk(parts, pplh) {//{{{
    const sql = [];
    for (let i=0; i<parts.length; i++) {
        sql.push(parts[i]);
        sql.push(pplh[i]);
    };
    return sql.join("");
};//}}}

module.exports = Compiler(lib, finishCbk);

