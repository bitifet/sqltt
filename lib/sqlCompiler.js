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

class sqlCompiler {//{{{


    constructor(target, engInfo, literals = {}) {
        const self = this;
        self.target = target;
        self.engInfo = engInfo;
        [self.eng, self.engineFlavour, self.targettedEngName] = self.engInfo;
        self.literals = literals;

        self.src2tpl = function src2tpl(src) { // Ensures sqltt instance{{{
            if ( // Allow source too:
                typeof src.sql == "function"
                && ! src.getSource // sqltt objects has a sql() function too...
            ) {
                src = new self.target.constructor(src);
            };
            return src;
        };//}}}



        function scompiler(parts, ...placeholders) {//{{{
            const sql = [];

            function interpolate(plh, i) {//{{{
                if (plh instanceof interpolation) return plh.render();
                switch (typeof plh) {
                    case "undefined":
                        if (i == placeholders.length) return ""; // No placeholder at the very end.
                    case "string":
                        return self.arg(plh).render();
                    case "object":   // Actual sqltt instance:
                        if (plh instanceof Array) {
                            return plh
                                .map(interpolate)
                                .join(", ")
                            ;
                        };

                        // Subtemplate:
                        // ------------
                        const subTpl = self.subTemplate(plh);
                        if (subTpl) return subTpl.render();
                        // ------------

                    default:
                        throw new Error("Wrong placehloder type: " + typeof plh);
                };
            };//}}}

            for (let i=0; i<parts.length; i++) {
                sql.push(parts[i]);
                sql.push(interpolate(placeholders[i], i));
            };

            return sql.join("");
        };//}}}

        scompiler.arg = self.arg.bind(self);
        scompiler.literal = self.literal.bind(self);
        scompiler.include = self.subTemplate.bind(self);

        return scompiler;

    };

    arg(argName) {//{{{
        const self = this;
        if (argName instanceof Array) return argName.map(s=>self.arg(s).wrap());
        return new interpolation (
            hookApply (
                self.target
                , self.targettedEngName
                , argName
                , self.literals[argName] === undefined
                    ? self.eng.indexer(self.target.argIdx[argName], argName)
                    : self.literals[argName]
            )
        );
    };//}}}
    literal(str) {//{{{
        const self = this;
        if (str instanceof Array) return str.map(s=>self.literal(s).wrap());
        return new interpolation (
            hookApply(self.target, self.targettedEngName, str, str)
        );
    };//}}}
    subTemplate(src, bindings = {}) {//{{{
        const self = this;
        if (src instanceof Array) return src
            .map(self.src2tpl)
            .map(
                s=>self
                    .subTemplate(s, bindings)
                    .wrap(self.eng.alias(s.getSource().alias))
            )
        ;
        src = self.src2tpl(src);
        // Actual sqltt instance:
        if ("function" == typeof src.getSource) {
            const str = src.getSource(self.engineFlavour).sql(new self.constructor(self.target, self.engInfo, bindings));
            return new interpolation (
                str
            );
        };
    };//}}}

};//}}}

module.exports = sqlCompiler;

