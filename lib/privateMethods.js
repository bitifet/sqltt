// lib/privateMethods.js
// =====================
"use strict";
const D = require("./definitions");
const _priv_ = D.sym_private;
const hlp = require("./helpers");
const engine = require("./engines");
const argCompiler = require("./argCompiler");

function expandCTEs(me, ctes) {//{{{
    let isRoot = false;
    if (! ctes) {
        ctes = {};
        isRoot = true;
    }
    Object.entries(me.source.with || {})
        .map(function([cId, src]) {
            expandCTEs(
                hlp.instantiate(src, me.constructor)
                , ctes
            );
            if (ctes[cId] && ctes[cId] !== src) throw "CTE name already in use: " + cId;
            ctes[cId] = src;
        })
    ;
    if (isRoot) Object.entries(ctes).map(
        // Return all CTE's instantiated.
        // Cannot be done earlier because they need to be mutually identified
        // on collisions.
        ([cId, src])=>ctes[cId]=hlp.instantiate(src, me.constructor)
    );
    return ctes;
};//}}}

function getArguments(me, engName) {//{{{
    // Recursively retrieve arguments from template respecting
    // specified order (if given).
    const eng = engine.resolve(me, engName);

    function render(query, props) {
        const tagFn = new argCompiler(me, eng, {},  props);
            ///// FIXME: Check if it is inexcusable to pick for engine for arguments.
        return query.getSource(eng.flavour).sql(tagFn);
    };

    const tplArgs = []; // Collect template arguments:
    Object.entries(me[_priv_].ctes) // From CTEs
        .map(([alias, query])=>tplArgs.push(render(query, {isCTE: true})))
    ;
    Array.prototype.push.apply( // From query itself
        tplArgs, render(me, {isCTE: false})
    );

    const argSpc = hlp.parseArgSpec( // Explicit (in tpl source) spec.
        me.getSource(eng.flavour).args
    );
    const argList = hlp.sortArgs( // (Auto)complete list.
        Object.keys(argSpc)
        , typeof tplArgs == "object" ? tplArgs : []
        , me[_priv_].options.check_arguments
    );

    return [argSpc, argList];
};//}}}

function checkTemplate(me) {//{{{
    if (typeof me.source.sql != "function") throw new Error (
        "Wrong template format: sql must be a function."
    );
    if (typeof me.source.altsql == "object") {
        const mainArgs = JSON.stringify(me.argList);
        for (let engFlav in me.source.altsql) {
            if (typeof me.source.altsql[engFlav] != "function") throw new Error (
                "Wrong template format: alternative sql for "+engFlav+" must be a function."
            );
            const args = getArguments(me, engFlav);
            if (JSON.stringify(args) !== mainArgs) throw new Error (
                "Arguments mismatch in alternative sql for "+engFlav+"."
            );
        };
    };

};//}}}

module.exports = {
    loadTemplate(inTpl) {//{{{
        const me = this;
        if (
            (typeof inTpl == "string")
            || (typeof inTpl == "function")
        ) inTpl = {sql: inTpl};
            // Accept simple string too.
        me.source = Object.assign({}, inTpl);
        if (typeof me.source.sql === "string") {
            // Accept string if no argument interpolation needed
            const sqlStr = me.source.sql;
            me.source.sql = $=>$`${$.literal(sqlStr)}`;
        };
        me[_priv_].ctes = expandCTEs(me);
        [me.argSpec, me.argList] = getArguments(me);
        me.argIdx = hlp.indexArgs(me.argList);
        me.hooks = me.source.hooks || [];
        checkTemplate(me);
        return inTpl;
    },//}}}
};
