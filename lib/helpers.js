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
                    return plh.getSource().sql(argCompiler.bind(bindings));
                } else if (
                    typeof plh.sql == "function"
                    // WARNING: sqltt objects has a sql() function too
                    // so "&& ! plh.getSource" (already checked)
                ) {
                    return plh.sql(argCompiler.bind(bindings));
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
    const tplArgs = sourceTpl.sql(argCompiler.bind({}));
    return Array.from(
        new Set(flatten([...(sourceTpl.args || []), ...tplArgs]))
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
