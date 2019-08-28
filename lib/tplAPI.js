// lib/tplAPI.js
// =============
"use strict";
const D = require("./definitions");
const _priv_ = D.sym_private;
const hlp = require("./helpers");
const engine = require("./engines");
const sqlCompiler = require("./sqlCompiler");

function argsRender(me, data = {}) {//{{{
    if (data instanceof Array) return data;
        // Accept regular positional parameters too
        // (No check is made in this case).
    return me.argList.map(k=>D.argParser(data[k]));
};//}}}

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
        if (me.sqlCache[eng.name] !== undefined) return me.sqlCache[eng.name];
        const qtpl = me.getSource(eng.flavour).sql;
        const outSql = hlp.softBind(eng.sqlWrapper, me)(qtpl(new sqlCompiler(me, eng)));
        me.sqlCache[eng.name] = outSql;
        return outSql.replace(D.re_rowtrim, "");
    },//}}}
    args(raw = {}) {//{{{
        const me = this;
        const rendered = argsRender(me, raw);
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
    options(opts) {//{{{
        const me = this;
        const clone = hlp.clone(me);
        clone[_priv_].options = {...me[_priv_].options, ...opts};
        return clone;
    },//}}}
    data(dataPatch = {}) {//{{{
        const me = this;

        const source = Object.assign({}, hlp.clone(me.getSource()));
        const presets = Object.assign({}, source.presets || []);

        if (typeof dataPatch == "string") dataPatch = dataPatch.split(/\s*,\s*/);
        if (dataPatch instanceof Array) {
            if (! Object.keys(presets).length) throw "No data presets defined.";
            if (! dataPatch.length) throw "No data presets specified.";
            dataPatch = dataPatch.map(function(key){
                const p = presets[key];
                if (p === undefined) throw "Preset " + key + " not defined.";
                return p
            });
            dataPatch = Object.assign.apply(null, [{}, ...dataPatch]);
        };
        source.data = Object.assign({}
            , source.data || {}
            , dataPatch
        );
        return new me.constructor(
            source
            , {...me[_priv_].options}
        );
    },//}}}
};
