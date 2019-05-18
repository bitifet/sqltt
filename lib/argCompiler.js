// lib/argCompiler.js
// ==================
"use strict";
const interpolation = require("./interpolation");

class argCompiler {

    constructor(target, engFlav, literals = {}) {
        const self = this;
        self.literals = literals;
        self.target = target;
        self.engineFlavour = engFlav;

        function acompile(parts, ...placeholders){//{{{
            function interpolate (plh, i, bindings = {}) {//{{{
                if (plh instanceof interpolation) return plh.render();
                switch (typeof plh) {
                    case "string":
                        return self.arg(plh).render();
                    case "object":   // Actual sqltt instance:
                        if (plh instanceof Array) {
                            return plh
                                .map(interpolate)
                            ;
                        };

                        // Subtemplate:
                        // ------------
                        const subTpl = self.subTemplate(plh);
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

        acompile.arg = self.arg.bind(self);
        acompile.literal = self.literal.bind(self);
        acompile.include = self.subTemplate.bind(self);

        return acompile;

    };

    arg(argName) {//{{{
        const self = this;
        if (argName instanceof Array) return argName.map(self.arg.bind(self));
        if (! argName.length) throw new Error("Empty placehloder name is not allowed");
        return new interpolation (
            self.literals[argName] === undefined
                ? argName
                : null
        );
    };//}}}
    literal() {//{{{
        return new interpolation(null);
        // Ignore literals while parsing arguments.
    };//}}}
    subTemplate(src, bindings) {//{{{
        const self = this;

        if (src instanceof Array) return src.map(s=>self.subTemplate(s, bindings));
        if ( // Allow source too:
            typeof src.sql == "function"
            && ! src.getSource // sqltt objects has a sql() function too...
        ) {
            src = new self.target.constructor(src);
        };

        // Actual sqltt instance:
        if ("function" == typeof src.getSource) {
            return new interpolation (
                src.getSource(self.engineFlavour).sql(new self.constructor(self.target, self.engineFlavour, bindings))
            );
        };

    };//}}}

};


module.exports = argCompiler;
