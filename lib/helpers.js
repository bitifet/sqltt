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

function indexArgs(args) {//{{{
    const idx = {};
    for (let i=0; i<args.length;) idx[args[i]] = ++i;
    return idx;
};//}}}

module.exports = {
    flatten,
    indexArgs,    // Build an arguments (position) index.
};
