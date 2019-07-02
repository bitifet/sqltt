// lib/sqlCompiler.js
// ==================
"use strict";
const interpolation = require("./interpolation");
const Compiler = require("./compilerClass");
const {hookApply} = require("./helpers");
const re_rowtrim = /^(?:\s*\n)*|(?:\n\s*)*$/g;
const re_spacing = /(\b|$)/g;
const _object_ = Object.getPrototypeOf({});

function resolveAlias(argName, aliasSpc) {//{{{
    return (typeof aliasSpc) == "string"
        ? aliasSpc // Explicit specification
        : aliasSpc && argName // Enable / Disable using argName
    ;
};//}}}

// -----------------------------------------------------------------------

function arg(argName, argAlias) {//{{{
    const me = this;
    if (argName instanceof Array) return argName.map(
        s=>me.arg(s, argAlias ? s : "")
    );
    if (
        Object.getPrototypeOf(argName) === _object_
    ) return Object.keys(argName).map(
        k=>me.arg(k, resolveAlias(k, argName[k]))
    );
    return new interpolation (
        hookApply (
            me.target
            , me.eng.name
            , argName
            , me.literals[argName] === undefined
                ? me.eng.indexer(me.target.argIdx[argName], argName)
                : me.literals[argName]
        )
    ).alias(argAlias);
};//}}}
function literal(str) {//{{{
    const me = this;
    if (str instanceof Array) return str.map(s=>me.literal(s));
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
                .wrap()
                .alias(me.eng.alias(s.getSource().alias))
        )
    ;
    src = me.src2tpl(src);

    return new interpolation (
        src.getSource(me.eng.flavour).sql(
            new me.constructor(me.target, me.eng, bindings)
        ).replace(re_rowtrim, "")
    );
};//}}}
function keys(argSpec, sep = ",") {//{{{
    const me = this;
    const keyParser = literal.bind(me);
    sep = sep.replace(re_spacing, ' ');
    return new interpolation (
        (argSpec instanceof Array
            ? argSpec
            : Object.keys(argSpec)
        )
        .map(
            key=>keyParser(key).render()
        )
        .join(sep)
    );
};//}}}
function values(argSpec, sep=",") {//{{{
    sep = sep.replace(re_spacing, ' ');
    return new interpolation(
        Object.values(argSpec)
        .join(sep)
    );
};//}}}
function entries(argSpec, sep=",") {//{{{
    const me = this;
    const keyParser = literal.bind(me);
    const valParser = arg.bind(me);
    const keyIdx = argSpec instanceof Array ? 1 : 0;
    const valIdx = 1;
    sep = sep.replace(re_spacing, ' ');
    return new interpolation (Object.entries(argSpec)
        .map(function(pair) {
            const key = pair[keyIdx];
            const value = pair[valIdx] === true
                ? key
                : pair[valIdx]
            ;
            return keyParser(key).render()
                + " = "
                + valParser(value).render()
            ;
        })
        .join(sep)
    );
};//}}}
function REM() { // REMember (Comments){{{
    return new interpolation("");
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
    entries,
    REM,
    _arr,
}, finishCbk);

