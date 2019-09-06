// lib/argCompiler.js
// ==================
"use strict";
const D = require("./definitions");
const interpolation = require("./interpolation");
const Compiler = require("./compilerClass");
const _object_ = Object.getPrototypeOf({});
const hlp = require("./helpers");

// -----------------------------------------------------------------------

function arg(argName) {//{{{
    const me = this;
    if (argName instanceof Array) return argName.map(me.arg.bind(me));
    if (
        Object.getPrototypeOf(argName) === _object_
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


    // ////console.log(src.sql.bind(me.target)(me.eng.flavour));
    // console.log(me.target.sql.bind(src)(me.eng.flavour));
    // console.log ("---------------");
    // console.log(me.target.sql.bind(src)(me.eng.flavour));
    // console.log ("---------------");


    // Actual sqltt instance:
    return new interpolation (


       ///src.sql(me.eng.flavour)

        ///me.target.sql.bind(src)(me.eng.flavour)



        // src.getSource(me.eng.flavour).sql(
        //     new me.constructor(me.target, me.eng.flavour, bindings)
        // )
    );

};//}}}
function entries(argSpec, sep=D.default_sep, wrapStr=D.default_wrapStr, formatStr=D.default_formatStr) {//{{{
    if (! formatStr.match(D.re_placeholder2)) return new interpolation (null);
    if (typeof argSpec != "object") argSpec = [argSpec];
    return Object.entries(argSpec)
        .map(pair=>pair[1] === true
            ? pair[0]
            : pair[1]
        )
    ;
};//}}}
function keys(argSpec, sep, wrapStr) {//{{{
    return entries.call(this, argSpec, sep, wrapStr, '%1');
};//}}}
function values(argSpec, sep, wrapStr) {//{{{
    return entries.call(this, argSpec, sep, wrapStr, '%2');
};//}}}
function data(key) {//{{{
    const me = this;
    const contents = (me.target.source.data || {})[key];
    return contents || [];
};//}}}
function REM() { // REMember (Comments){{{
    return new interpolation(null);
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
