// lib/compiler_sql.js
// ===================
"use strict";
const D = require("./definitions");
const interpolation = require("./interpolation");
const Compiler = require("./compiler_base");
const common = require("./compiler_common");
const {hookApply} = require("./helpers");
const hlp = require("./helpers");

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
        Object.getPrototypeOf(argName) === D.proto_object
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
        .map(x=>hlp.instantiate(x,me.target.constructor))
        .map(
            s=>me
                .include(s, bindings)
                .wrap()
                .alias(me.eng.alias(s.getSource().alias))
        )
    ;
    src = hlp.instantiate(src, me.target.constructor);

    if (Object.keys(src.source.with || {}).length) throw (
        "Including queries with CTEs is not yet supported."
    );

    return new interpolation (
        src.getSource(me.eng.flavour).sql(
            new me.constructor(me.target, me.eng, bindings)
        )
            .replace(D.re_rowtrim, "")
        + "\n" // Prevent ending inline comments from breaking inclusion
    );
};//}}}
function entries(argSpec, sep=D.default_sep, wrapStr=D.default_wrapStr, formatStr=D.default_formatStr) {//{{{
    if (typeof argSpec != "object") argSpec = [argSpec];
    const me = this;
    const parsers = {
        "%": literal.bind(me), // keyParser
        "$": arg.bind(me), // valParser
    };
    const keyIdx = argSpec instanceof Array ? 1 : 0;
    const valIdx = 1;
    sep = sep.replace(D.re_spacing, ' ');
    if (! wrapStr.match(D.re_placeholder_simple)) wrapStr += ' %';
    const contents = Object.entries(argSpec)
        .map(function(pair) {

            const data = ['' // (padding)
                // Key:
                , pair[keyIdx]
                // Value:
                , pair[valIdx] === true
                    ? key
                    : pair[valIdx]
            ];


            return formatStr.replace(
                D.re_placeholder
                , (x, p, i) => parsers[p](data[i]).render()
            );
        })
    ;
    return new interpolation (
        contents.length
            ? wrapStr.replace(D.re_placeholder_simple, contents.join(sep))
            : ""
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

module.exports = Compiler(common({
    arg,
    literal,
    include,
    entries,
    REM,
    _arr,
    // default: undefined
    //   "default" keyword is reserved in order to be used as "$.default"
    //   meaning default value for intermediate argument.
    //   It doesn't need special implementation because, since not defined,
    //   will return undefined.
}), finishCbk);
