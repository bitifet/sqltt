// lib/compilerClass.js
// ====================
"use strict";
const interpolation = require("./interpolation");
const engine = require("./engines");

module.exports = function buildCompiler(lib, finishCbk) {

    return function Compiler (target, eng, literals = {}, props = {}) {
        const me = this;
        me.literals = literals;
        me.target = target;
        me.eng = engine.resolve(me
            , typeof eng == "string" ? eng : eng.name
        );

        function tagFn(parts, ...placeholders) {

            function interpolate (plh, i) {//{{{
                if (plh instanceof interpolation) return plh.render();
                switch (typeof plh) {
                    case "undefined":
                        if (i == placeholders.length) return ""; // No placeholder at the very end.
                    case "string":
                        return me.arg(plh).render();
                    case "object":
                        if (plh === null) return me.literal("").render();
                        if (plh instanceof Array) {
                            return me._arr(
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

        };

        Object.entries(lib).map(([k, v])=>tagFn[k]=(me[k]=v.bind(me)));
        Object.entries(props).map(([k, v])=>tagFn[k]=v);

        return tagFn;

    };

};
