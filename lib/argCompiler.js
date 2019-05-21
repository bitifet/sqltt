// lib/argCompiler.js
// ==================
"use strict";
const interpolation = require("./interpolation");

class argCompiler {

    constructor(target, engFlav, literals = {}) {
        const me = this;
        me.literals = literals;
        me.target = target;
        me.engineFlavour = engFlav;

        function acompile(parts, ...placeholders){//{{{
            function interpolate (plh, i, bindings = {}) {//{{{
                if (plh instanceof interpolation) return plh.render();
                switch (typeof plh) {
                    case "string":
                        return me.arg(plh).render();
                    case "object":   // Actual sqltt instance:
                        if (plh instanceof Array) {
                            return plh
                                .map(interpolate)
                            ;
                        };

                        // Subtemplate:
                        // ------------
                        const subTpl = me.subTemplate(plh);
                        if (subTpl) return subTpl.render();
                        // ------------

                    default:
                        throw new Error("Wrong placeholder type: " + typeof plh);
                };
            };//}}}
            return placeholders
                .map(interpolate)
                .filter(x=>x!==null)
            ;
        };//}}}

        acompile.arg = me.arg.bind(me);
        acompile.literal = me.literal.bind(me);
        acompile.include = me.subTemplate.bind(me);

        return acompile;

    };

    arg(argName) {//{{{
        const me = this;
        if (argName instanceof Array) return argName.map(me.arg.bind(me));
        if (! argName.length) throw new Error("Empty placehloder name is not allowed");
        return new interpolation (
            me.literals[argName] === undefined
                ? argName
                : null
        );
    };//}}}
    literal() {//{{{
        return new interpolation(null);
        // Ignore literals while parsing arguments.
    };//}}}
    subTemplate(src, bindings) {//{{{
        const me = this;

        if (src instanceof Array) return src.map(s=>me.subTemplate(s, bindings));
        if ( // Allow source too:
            typeof src.sql == "function"
            && ! src.getSource // sqltt objects has a sql() function too...
        ) {
            src = new me.target.constructor(src);
        };

        // Actual sqltt instance:
        if ("function" == typeof src.getSource) {
            return new interpolation (
                src.getSource(me.engineFlavour).sql(new me.constructor(me.target, me.engineFlavour, bindings))
            );
        };

    };//}}}

};


module.exports = argCompiler;
