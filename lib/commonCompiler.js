// lib/commonCompiler.js
// =====================
"use strict";
// const D = require("./definitions");
const interpolation = require("./interpolation");
// const Compiler = require("./compilerClass");
// const _object_ = Object.getPrototypeOf({});
// const hlp = require("./helpers");


// -----------------------------------------------------------------------
function data(key) {//{{{
    const me = this;
    const contents = (me.target.source.data || {})[key];
    return contents || [];
};//}}}
function REM() { // REMember (Comments){{{
    return new interpolation(null);
};//}}}
// -----------------------------------------------------------------------

module.exports = function builder(base) {

    function keys(argSpec, sep, wrapStr) {//{{{
        return base.entries.call(this, argSpec, sep, wrapStr, '%1');
    }//}}}
    function values(argSpec, sep, wrapStr) {//{{{
        return base.entries.call(this, argSpec, sep, wrapStr, '%2');
    }//}}}

    return Object.assign(base, {
        data,
        keys,
        values,
        REM,
    });
};

