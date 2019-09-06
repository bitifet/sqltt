// lib/compiler_common.js
// ======================
"use strict";
const interpolation = require("./interpolation");
const hlp = require("./helpers");

// -----------------------------------------------------------------------
function data(key, filter) {//{{{
    const me = this;
    let contents = (
        (me.target.source.data || {})[key]
        || []
    );
    if (filter) {
        const f0 = filter;
        contents = hlp.deepCopy(contents); // De-refence items
        if (filter instanceof Array) filter = (v)=>f0.indexOf(v)>=0;
        if (typeof filter != "function") filter = (v)=>v.match(f0);
        Object.entries(contents).map(function([k,v]) {
            if (! filter(v, k)) delete contents[k];
            // Doesn't matter if contents is an array
        });
    };
    return contents;
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

