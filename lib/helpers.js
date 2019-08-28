"use strict";
const Chalk = require("chalk");
const D = require("./definitions");

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

const softBind = (function() {//{{{
    const master = Symbol();
    return function softBind(self, ...args) {
        const fn0 = self[master] || self;
        const fn = fn0.bind(...args);
        fn[master] = fn0;
        return fn;
    }
})();//}}}

module.exports = {
    parseArgSpec(argSpc) {//{{{
        // Unspecified:
        if (! argSpc) return {};
        // Already regular object:
        if (Object.getPrototypeOf(argSpc || []) === D.proto_object) return argSpc;
        if (! argSpc instanceof Array) throw "Wrong arguments specification.";
        // Array (enumeratiion only):
        const newSpc = {};
        for (let i=0; i<argSpc.length; i++) newSpc[argSpc[i]] = "(Undocumented)";
        return newSpc;
    },//}}}
    sortArgs(required, fromTpl, checkArgs = true) {//{{{
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
    indexArgs(args) { // Build an arguments (position) index.{{{
        const idx = {};
        for (let i=0; i<args.length;) idx[args[i]] = ++i;
        return idx;
    },//}}}
    hookApply(me, engName, arg, rarg) {//{{{
        const hook = me.hooks[arg];
        if (! hook) return rarg;
        const hookt = typeof hook;
        if (hookt == "function") return hook(rarg, engName) || rarg;
        if (hookt == "string") return hook.replace(/%/g, rarg);
        throw new Error ("Invalid hook type: " + hookt);
    },//}}}
    queryDebugLog(flag, args, src) {//{{{
        const lbl = ((src.name || "").trim()
            || (src.description || "").trim().substring(20)
            || 'ANONYMOUS'
        );
        if (typeof flag == "string") flag = flag.toLowerCase();
        const argStr = (
            flag == "verbose" ? JSON.stringify(args.raw)
            : flag == "cli" ? args.rendered.map(D.cliEscape).join(" ")
            : JSON.stringify(args.rendered)
        );
        const now = (new Date()).toLocaleString();
        console.log ([
            Chalk.blue("["+now+"]"),
            " - ",
            Chalk.yellow(lbl + ": "),
            Chalk.white(argStr),
        ].join(""));
    },//}}}
    clone(target) {//{{{
        return Object.assign(
            Object.create(Object.getPrototypeOf(target))
            , target
        );
    },//}}}
    customError(errMsg, fn, ...args) {//{{{
        try {
            return fn(...args);
        } catch (err) {
            throw new Error(errMsg);
        };
    },//}}}
    softBind,
    parseJSON: softBind(JSON.parse, JSON), // Do things well even unecessary.
};
