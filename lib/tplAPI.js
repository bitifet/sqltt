// lib/tplAPI.js
// =============
"use strict";
const D = require("./definitions");
const _priv_ = D.sym_private;
const hlp = require("./helpers");
const engine = require("./engines");
const sqlCompiler = require("./compiler_sql");

module.exports = {
    getSource(engFlav) {//{{{
        const me = this;
        const src = Object.assign({}, me.source);
        if (engFlav && src.altsql && src.altsql[engFlav]) src.sql = src.altsql[engFlav];
        return src;
    },//}}}
    sql(engName) {//{{{
        const me = this;
        const eng = engine.resolve(me, engName);
        if (me[_priv_].sqlCache[eng.name] !== undefined) return me[_priv_].sqlCache[eng.name];

        const wrapper = eng.sqlWrapper.bind(me);
        function render(query, props) {
            const tagFn = new sqlCompiler(me, eng, {},  props);
            return query.getSource(eng.flavour).sql(tagFn);
        };

        const cteBlock = Object.entries(me[_priv_].ctes)
            .map(function ([alias, query]) {
                return `${alias} as (${render(query, {isCTE: true})})`;
            })
            .join("\n, ")
        ;

        const outSql = wrapper(
            (cteBlock ? "WITH " + cteBlock : "")
            + render(me, {isCTE: false})
        );

        me[_priv_].sqlCache[eng.name] = outSql;
        return outSql.replace(D.re_rowtrim, "");
    },//}}}
    args(raw = {}) {//{{{
        const me = this;
        const rendered = (
            raw instanceof Array ? raw
                // Accept regular positional parameters too
                // (No check is made in this case).
            : me.argList.map(k=>D.argParser(raw[k]))
        );
        const dbg = me[_priv_].options.debug;
        if (dbg) hlp.queryDebugLog(dbg, {raw, rendered}, me.getSource());
        return rendered;
    },//}}}
    concat(str) {//{{{
        const me = this;
        const clone = hlp.clone(me);
        clone.sql = (...args) => me.sql(...args) + str;
        return clone;
    },//}}}
    limit(n) {
        const me = this;
        if (typeof n != "number" || isNaN(n)) throw "Wrong LIMIT value: (" + typeof n + ") "+n;
        const clone = hlp.clone(me);
        clone.sql = (...args) => me.sql(...args) + " LIMIT "+n;
        return clone;
    },
    wrap(wrapStr) {//{{{
        const me = this;
        const clone = hlp.clone(me);
        if (! wrapStr.match(D.re_placeholder_simple)) throw `Wrapping string ("${wrapStr}") lacks placeholder ("%").`;
        clone.sql = (...args) => wrapStr.replace(
            D.re_placeholder_simple
            , me.sql(...args).trim()
        );
        return clone;
    },//}}}
    options(opts) {//{{{
        const me = this;
        const clone = hlp.clone(me);
        clone[_priv_].options = {...me[_priv_].options, ...opts};
        return clone;
    },//}}}
    data(newData) {//{{{
        const me = this;
        const source = Object.assign({}, hlp.clone(me.source));
        if (
            typeof newData != "object"
            || Object.getPrototypeOf(newData) !== D.proto_object
        ) throw "Wrong data object";
        source.data = newData;
        return new me.constructor(
            source
            , {...me[_priv_].options}
        );
    },//}}}
    mutation(...mutSpecs) {//{{{
        const me = this;
        const presets = me.source.presets || {};
        let data = Object.assign({}, hlp.clone(me.source.data || {}));
        mutSpecs.map(function(spc) {
            if (typeof spc == "string") { // Use a named preset
                if (presets[spc] === undefined) throw `Preset ${spc} not defined.`;
                spc = presets[spc];
            };
            if (spc === null) {
                data = {}; // Whole data reset.
            } else {
                if (typeof spc != "object") throw `Wrong mutation spec type (${typeof spc}).`
                Object.entries(spc).map(function([key, patch]) {
                    const targetProto = (
                        data[key] && typeof data[key] == "object" ? Object.getPrototypeOf(data[key])
                        : undefined
                    );
                    const patchProto = (
                        patch && typeof patch == "object" ? Object.getPrototypeOf(patch)
                        : undefined
                    );
                    if (patch === null) { // Item reset.
                        delete data[key];
                    } else if (
                        data[key] === undefined      // Not yet defined.
                        || typeof patch != "object"  // Scalar values always overwrite.
                        || targetProto !== patchProto // Not same kind of objects
                        // || ! ( // Pure object or array
                        //     targetProto === D.proto_object
                        //     || targetProto === D.proto_array
                        // )
                    ) {
                        data[key] = patch; // Replace
                    } else {
                        data[key] = hlp.deepCopy(data[key]);
                        if (targetProto === D.proto_array) {
                            Array.prototype.push.apply(data[key], patch);
                        } else { // Pure object
                            Object.assign(data[key], patch);
                        };
                    };

                });
            };

        });
        return me.data(data);
    },//}}}
};
