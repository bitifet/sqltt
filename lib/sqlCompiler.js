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


    constructor(target, eng, literals = {}) {
        const me = this;
        me.target = target;
        me.eng = eng;
        me.literals = literals;

        me.src2tpl = function src2tpl(src) { // Ensures sqltt instance{{{
            if ( // Allow source too:
                typeof src.sql == "function"
                && ! src.getSource // sqltt objects has a sql() function too...
            ) {
                src = new me.target.constructor(src);
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
                        return me.arg(plh).render();
                    case "object":   // Actual sqltt instance:
                        if (plh instanceof Array) {
                            return plh
                                .map(interpolate)
                                .join(", ")
                            ;
                        };

                        // Subtemplate:
                        // ------------
                        const subTpl = me.subTemplate(plh);
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

        scompiler.arg = me.arg.bind(me);
        scompiler.literal = me.literal.bind(me);
        scompiler.include = me.subTemplate.bind(me);

        return scompiler;

    };

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
    };//}}}
    literal(str) {//{{{
        const me = this;
        if (str instanceof Array) return str.map(s=>me.literal(s).wrap());
        return new interpolation (
            hookApply(me.target, me.eng.name, str, str)
        );
    };//}}}
    subTemplate(src, bindings = {}) {//{{{
        const me = this;
        if (src instanceof Array) return src
            .map(me.src2tpl)
            .map(
                s=>me
                    .subTemplate(s, bindings)
                    .wrap(me.eng.alias(s.getSource().alias))
            )
        ;
        src = me.src2tpl(src);
        // Actual sqltt instance:
        if ("function" == typeof src.getSource) {
            const str = src.getSource(me.eng.flavour).sql(new me.constructor(me.target, me.eng, bindings));
            return new interpolation (
                str
            );
        };
    };//}}}

};//}}}

module.exports = sqlCompiler;

