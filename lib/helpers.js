"use strict";

function flatten(inArr) {//{{{
    const outArr = [];
    for (let i=0; i<inArr.length; i++) {
        if (inArr[i] instanceof Array) {
            [].push.apply(outArr, flatten(inArr[i]));
        } else {
            outArr.push(inArr[i]);
        };
    };
    return outArr;
};//}}}

function argCompiler(parts, ...placeholders){//{{{
    const literals = this;
    function interpolate (plh, i, bindings = {}) {
        switch (typeof plh) {
            case "string":
                if (! plh.length) throw new Error("Empty placehloder name is not allowed");
                return (
                    literals[plh] === undefined
                        ? plh
                        : null
                );
            case "function": // Template source:
                return plh(argCompiler.bind(bindings)).sql;
            case "object":   // Actual sqlst instance:
                if (
                    plh instanceof Array
                ) {
                    if (typeof plh[0] == "string") return null;
                        // Allow ["foo"] to apply hooks avoiding argument interpolation.
                    return interpolate(plh[0], i, plh[1]);
                } else if (
                    "function" == typeof plh.getSource
                ) {
                    return plh.getSource()(argCompiler.bind(bindings)).sql;
                };
            default:
                throw new Error("Wrong placehloder type: " + typeof plh);
        };
    }

    return placeholders
        .map(interpolate)
        .filter(x=>x!==null)
    ;
};//}}}

function getArguments(sourceTpl) {//{{{
    const aTpl = sourceTpl(argCompiler.bind({}));
    return Array.from(
        new Set(flatten([...(aTpl.args || []), ...aTpl.sql]))
    );
};//}}}

function indexArgs(args) {//{{{
    const idx = {};
    for (let i=0; i<args.length;) idx[args[i]] = ++i;
    return idx;
};//}}}

module.exports = {

    getArguments, // Recursively retrieve arguments from template respecting
                  // specified order (if given).

    indexArgs,    // Build an arguments (position) index.

};
