// lib/compiler_args.js
// ====================
"use strict";
const D = require("./definitions");
const interpolation = require("./interpolation");
const Compiler = require("./compiler_base");
const common = require("./compiler_common");
const hlp = require("./helpers");

// -----------------------------------------------------------------------

function arg(argName) {//{{{
    const me = this;
    if (argName instanceof Array) return argName.map(me.arg.bind(me));
    if (
        Object.getPrototypeOf(argName) === D.proto_object
    ) {
        return Object.keys(argName).map(
            me.arg.bind(me)
        );
    };
    if (! argName.length) throw new Error("Empty placehloder name is not allowed");
    return new interpolation (
        me.literals[argName] === undefined
            ? argName
            : null
    );
};//}}}
function literal() {//{{{
    return new interpolation(null);
    // Ignore literals while parsing arguments.
};//}}}
function include(src, bindings) {//{{{
    const me = this;
    if (src instanceof Array) return src
        .map(x=>hlp.instantiate(x,me.target.constructor))
        .map(
            s=>me
                .include(s, bindings)
                /// WTF (this make tests to fail...) .wrap().alias(me.eng.alias(s.getSource().alias))
                ////// FIXME!!!! Understand what the hell was this and decide if it is still needed.
        )
    ;
    src = hlp.instantiate(src, me.target.constructor);

    // Actual sqltt instance:
    return new interpolation (
        src.getSource(me.eng.flavour).sql(
            new me.constructor(me.target, me.eng.flavour, bindings)
        )
    );

};//}}}
function entries(argSpec, sep, wrapStr, formatStr=D.default_formatStr) {//{{{
    if (typeof argSpec != "object") argSpec = [argSpec];
    const keyIdx = argSpec instanceof Array ? 1 : 0;
    const valIdx = 1;
    const contents = {};
    Object.entries(argSpec)
        .map(function(pair) {
            const data = ['' // (padding)
                // Key:
                , pair[keyIdx]
                // Value:
                , pair[valIdx] === true
                    ? pair[keyIdx]
                    : pair[valIdx]
            ];
            formatStr.replace(
                D.re_placeholder
                , function(x, p, i) {
                    if (p == "$") contents[data[i]] = true;
                }
            );
        })
    ;
    return Object.keys(contents);
};//}}}
function _arr(inArr) {//{{{
    return inArr;
};//}}}

// -----------------------------------------------------------------------

function finishCbk(parts, pplh) {//{{{
    return pplh.filter(x=>x!==null);
};//}}}

module.exports = Compiler(common({
    arg,
    literal,
    include,
    entries,
    _arr,
    // default: undefined
    //   "default" keyword is reserved in order to be used as "$.default"
    //   meaning default value for intermediate argument.
    //   It doesn't need special implementation because, since not defined,
    //   will return undefined.
}), finishCbk);
