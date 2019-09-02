// lib/privateMethods.js
// =====================
"use strict";
const D = require("./definitions");
const _priv_ = D.sym_private;
const hlp = require("./helpers");
const engine = require("./engines");
const argCompiler = require("./argCompiler");

function getArguments(me, engName) {//{{{
    // Recursively retrieve arguments from template respecting
    // specified order (if given).
    const eng = engine.resolve(me, engName);
    const sourceTpl = me.getSource(eng.flavour);
    const tplArgs = sourceTpl.sql(
        new argCompiler(me, eng) ///// FIXME: Check if it is inexcusable to pick for engine for arguments.
    );
    const argSpc = hlp.parseArgSpec(sourceTpl.args);
    const argList = hlp.sortArgs(
        Object.keys(argSpc)
        , typeof tplArgs == "object" ? tplArgs : []
        , me[_priv_].options.check_arguments
    );
    return [argSpc, argList];
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
        [me.argSpec, me.argList] = getArguments(me);
        me.argIdx = hlp.indexArgs(me.argList);
        me.hooks = me.source.hooks || [];
        return inTpl;
    },//}}}
    checkTemplate() {//{{{
        const me = this;
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

    }//}}}
};