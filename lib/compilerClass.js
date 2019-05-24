// lib/compilerClass.js
// ====================
"use strict";
const interpolation = require("./interpolation");

module.exports = function buildCompiler(lib, finishCbk) {

    return function Compiler (target, eng, literals = {}) {
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

        function tagFn(parts, ...placeholders) {

            function interpolate (plh, i) {//{{{
                if (plh instanceof interpolation) return plh.render();
                switch (typeof plh) {
                    case "undefined":
                        if (i == placeholders.length) return ""; // No placeholder at the very end.
                    case "string":
                        return me.arg(plh).render();
                    case "object":
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

        Object.keys(lib).map(k=>tagFn[k]=(me[k]=lib[k].bind(me)));

        return tagFn;

    };

};
