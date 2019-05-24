// lib/sqlCompiler.js
// ==================
"use strict";
const interpolation = require("./interpolation");
const Compiler = require("./compilerClass");
const {hookApply} = require("./helpers");

// -----------------------------------------------------------------------

function arg(argName) {//{{{
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
};//}}}
function literal(str) {//{{{
    const me = this;
    if (str instanceof Array) return str.map(s=>me.literal(s).wrap());
    return new interpolation (
        hookApply(me.target, me.eng.name, str, str)
    );
};//}}}
function include(src, bindings = {}) {//{{{
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
};//}}}
function keys(argSpec) {//{{{
    const me = this;
    const keyParser = literal.bind(me);
    return (argSpec instanceof Array
        ? argSpec
        : Object.keys(argSpec)
    ).map(keyParser);
};//}}}
function values(argSpec) {//{{{
    return Object.values(argSpec);
};//}}}
function both(argSpec) {//{{{
    const me = this;
    const keyParser = literal.bind(me);
    const valParser = arg.bind(me);
    const keyIdx = argSpec instanceof Array ? 1 : 0;
    const valIdx = 1;
    return Object.entries(argSpec).map(pair=>new interpolation (
        keyParser(pair[keyIdx]).render()
        + " = "
        + valParser(pair[valIdx]).render()
    ));
};//}}}
function _arr(inArr) {//{{{
    return inArr.join(", ");
};//}}}

// -----------------------------------------------------------------------

function finishCbk(parts, pplh) {//{{{
    const sql = [];
    for (let i=0; i<parts.length; i++) {
        sql.push(parts[i]);
        sql.push(pplh[i]);
    };
    return sql.join("");
};//}}}

module.exports = Compiler({
    arg,
    literal,
    include,
    keys,
    values,
    both,
    _arr,
}, finishCbk);

