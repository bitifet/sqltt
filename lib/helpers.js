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
    return placeholders.map(function(plh) {
        switch (typeof plh) {
            case "string":
                if (! plh.length) throw new Error("Empty placehloder name is not allowed");
                return plh;
            case "function": // Template source:
                return plh(argCompiler).sql;
            case "object":   // Actual sqlst instance:
                if ("function" == typeof plh.getSource) {
                    return plh.getSource()(argCompiler).sql;
                };
            default:
                throw new Error("Wrong placehloder type: " + typeof plh);
        };
    });
};//}}}

function getArguments(sourceTpl) {//{{{
    const aTpl = sourceTpl(argCompiler);
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
