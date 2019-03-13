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

module.exports = {
    sortArgs: function argChecker(required, fromTpl, checkArgs = true) {//{{{
        const reql = required.length;
        required = new Set(required);
        fromTpl = new Set(flatten(fromTpl));
        const unused = new Set([...required].filter(x => !fromTpl.has(x)));
        if (checkArgs) {
            if (reql !== Array.from(required).length) throw new Error (
                "Repeated argument declaration"
            );
            if (unused.size) throw new Error (
                "Unused declared arguments: "
                + Array.from(unused).toString()
            );
        } else {
            if (unused.size) {
                required = new Set([...required].filter(x => !unused.has(x)));
            };
        };
        return Array.from(new Set([...required, ...fromTpl]));
    },//}}}
    indexArgs: function argIndexer(args) { // Build an arguments (position) index.{{{
        const idx = {};
        for (let i=0; i<args.length;) idx[args[i]] = ++i;
        return idx;
    },//}}}
};
