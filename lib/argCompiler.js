// lib/argCompiler.js
// ==================
"use strict";
const interpolation = require("./interpolation");

const lib = {
    arg(argName) {//{{{
        const me = this;
        if (argName instanceof Array) return argName.map(me.arg.bind(me));
        if (! argName.length) throw new Error("Empty placehloder name is not allowed");
        return new interpolation (
            me.literals[argName] === undefined
                ? argName
                : null
        );
    },//}}}
    literal() {//{{{
        return new interpolation(null);
        // Ignore literals while parsing arguments.
    },//}}}
    include(src, bindings) {//{{{
        const me = this;
        if (src instanceof Array) return src
            .map(me.src2tpl)
            .map(
                s=>me
                    .include(s, bindings)
                    /// WTF (this make tests to fail...) .wrap(me.eng.alias(s.getSource().alias))
                    ////// FIXME!!!! Understand what the hell was this and decide if it is still needed.
            )
        ;
        src = me.src2tpl(src);

        // Actual sqltt instance:
        return new interpolation (
            src.getSource(me.eng.flavour).sql(
                new me.constructor(me.target, me.eng.flavour, bindings)
            )
        );

    },//}}}
    arr(inArr) {//{{{
        return inArr;
    },//}}}
};

function finishCbk(parts, pplh) {//{{{
    return pplh.filter(x=>x!==null);
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
                        throw new Error("Wrong placeholder type: " + typeof plh);
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
