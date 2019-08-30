// lib/sqlCompiler.js
// ==================
"use strict";
const D = require("./definitions");
const interpolation = require("./interpolation");
const Compiler = require("./compilerClass");
const {hookApply} = require("./helpers");
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
        )
            .replace(D.re_rowtrim, "")
        + "\n" // Prevent ending inline comments from breaking inclusion
    );
};//}}}
function entries(argSpec, sep=D.default_sep, wrapStr=D.default_wrapStr, formatStr=D.default_formatStr) {//{{{
    if (typeof argSpec != "object") typeSpec = [argSpec];
    const me = this;
    const keyParser = literal.bind(me);
    const valParser = arg.bind(me);
    const keyIdx = argSpec instanceof Array ? 1 : 0;
    const valIdx = 1;
    sep = sep.replace(D.re_spacing, ' ');
    if (! wrapStr.match('%')) wrapStr += ' %';
    const contents = Object.entries(argSpec)
        .map(function(pair) {
            const key = pair[keyIdx];
            const value = pair[valIdx] === true
                ? key
                : pair[valIdx]
            ;
            return formatStr
                .replace(D.re_placeholder1, keyParser(key).render())
                .replace(D.re_placeholder2, valParser(value).render())
            ;
        })
    ;
    return new interpolation (
        contents.length
            ? wrapStr.replace('%', contents.join(sep))
            : ""
    );
};//}}}
function keys(argSpec, sep, wrapStr) {//{{{
    return entries.call(this, argSpec, sep, wrapStr, '%1');
}//}}}
function values(argSpec, sep, wrapStr) {//{{{
    return entries.call(this, argSpec, sep, wrapStr, '%2');
}//}}}
function data(key) {//{{{
    const me = this;
    const contents = (me.target.source.data || {})[key];
    return contents || [];
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
    entries,
    keys,
    values,
    data,
    REM,
    _arr,
    // default: undefined
    //   "default" keyword is reserved in order to be used as "$.default"
    //   meaning default value for intermediate argument.
    //   It doesn't need special implementation because, since not defined,
    //   will return undefined.
}, finishCbk);

