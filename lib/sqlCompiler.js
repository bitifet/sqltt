// lib/sqlCompiler.js
// ==================
"use strict";
const interpolation = require("./interpolation");

function hookApply(me, engName, arg, rarg) {//{{{
    const hook = me.hooks[arg];
    if (! hook) return rarg;
    const hookt = typeof hook;
    if (hookt == "function") return hook(rarg, engName) || rarg;
    if (hookt == "string") return hook.replace(/%/g, rarg);
    throw new Error ("Invalid hook type: " + hookt);
};//}}}

const lib = {
    arg(argName) {//{{{
        const me = this;
        if (argName instanceof Array) return argName.map(s=>me.arg(s).wrap());
        return new interpolation (
            hookApply (
                me.target
                , me.eng.name
                , argName
                , me.literals[argName] === undefined
                    ? me.eng.indexer(me.target.argIdx[argName], argName)
                    : me.literals[argName]
            )
        );
    },//}}}
    literal(str) {//{{{
        const me = this;
        if (str instanceof Array) return str.map(s=>me.literal(s).wrap());
        return new interpolation (
            hookApply(me.target, me.eng.name, str, str)
        );
    },//}}}
    include(src, bindings = {}) {//{{{
        const me = this;
        if (src instanceof Array) return src
            .map(me.src2tpl)
            .map(
                s=>me
                    .include(s, bindings)
                    .wrap(me.eng.alias(s.getSource().alias))
            )
        ;
        src = me.src2tpl(src);

        return new interpolation (
            src.getSource(me.eng.flavour).sql(
                new me.constructor(me.target, me.eng, bindings)
            )
        );
    },//}}}
    arr(inArr) {//{{{
        return inArr.join(", ");
    },//}}}
};

function finishCbk(parts, pplh) {//{{{
    const sql = [];
    for (let i=0; i<parts.length; i++) {
        sql.push(parts[i]);
        sql.push(pplh[i]);
    };
    return sql.join("");
};//}}}

class Compiler {

    constructor(target, eng, literals = {}) {
        const me = this;
        me.literals = literals;
        me.target = target;
        me.eng = eng;

        me.src2tpl = function src2tpl(src) { // Ensures sqltt instance{{{
            if ( // Allow source too:
                typeof src.sql != "function"
                || ! src.getSource // sqltt objects has a sql() function too...
            ) {
                src = new me.target.constructor(src);
            };
            return src;
        };//}}}

        function compile(parts, ...placeholders) {//{{{

            function interpolate (plh, i) {//{{{
                if (plh instanceof interpolation) return plh.render();
                switch (typeof plh) {
                    case "undefined":
                        if (i == placeholders.length) return ""; // No placeholder at the very end.
                    case "string":
                        return me.arg(plh).render();
                    case "object":   // Actual sqltt instance:
                        if (plh instanceof Array) {
                            return me.arr(
                                plh.map(interpolate)
                            );
                        };

                        // Subtemplate:
                        // ------------
                        const subTpl = me.include(plh);
                        if (subTpl) return subTpl.render();
                        // ------------

                    default:
                        throw new Error("Wrong placehloder type: " + typeof plh);
                };
            };//}}}


            return finishCbk (
                parts
                , placeholders.map(interpolate)
            );

        };//}}}

        Object.keys(lib).map(k=>compile[k]=(me[k]=lib[k].bind(me)));

        return compile;

    };


};

module.exports = Compiler;

