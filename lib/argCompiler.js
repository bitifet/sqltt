// lib/argCompiler.js
// ==================
"use strict";
const interpolation = require("./interpolation");
const Compiler = require("./compilerClass");

// -----------------------------------------------------------------------

function arg(argName) {//{{{
    const me = this;
    if (argName instanceof Array) return argName.map(me.arg.bind(me));
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
        .map(me.src2tpl)
        .map(
            s=>me
                .include(s, bindings)
                /// WTF (this make tests to fail...) .wrap(me.eng.alias(s.getSource().alias))
                ////// FIXME!!!! Understand what the hell was this and decide if it is still needed.
        )
    ;
    src = me.src2tpl(src);

    // Actual sqltt instance:
    return new interpolation (
        src.getSource(me.eng.flavour).sql(
            new me.constructor(me.target, me.eng.flavour, bindings)
        )
    );

};//}}}
function keys(argSpec) {//{{{
    return new interpolation(null);
};//}}}
function values(argSpec) {//{{{
    return Object.values(argSpec);
};//}}}
function _arr(inArr) {//{{{
    return inArr;
};//}}}

// -----------------------------------------------------------------------

function finishCbk(parts, pplh) {//{{{
    return pplh.filter(x=>x!==null);
};//}}}

module.exports = Compiler({
    arg,
    literal,
    include,
    keys,
    values,
    both: values,
    _arr,
}, finishCbk);
