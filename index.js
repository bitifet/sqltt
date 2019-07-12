"use strict";
const D = require("./lib/definitions");
const hlp = require("./lib/helpers");
const engine = require("./lib/engines");
const interpolation = require("./lib/interpolation");
const argCompiler = require("./lib/argCompiler");
const sqlCompiler = require("./lib/sqlCompiler");
const isCli = m=>(! m.parent || D.emulateCli);

const sqltt = (function(){ // Sql Tagged Template Engine

    // Private functions:
    // ------------------

    function getArguments(me, engName) {//{{{
        // Recursively retrieve arguments from template respecting
        // specified order (if given).
        const eng = engine.resolve(me, engName);
        const sourceTpl = me.getSource(eng.flavour);
        const tplArgs = sourceTpl.sql(
            new argCompiler(me, eng) ///// FIXME: Check if it is inexcusable to pick for engine for arguments.
        );
        return hlp.sortArgs(
            sourceTpl.args || []
            , typeof tplArgs == "object" ? tplArgs : []
            , me[D.sym_options].check_arguments
        );
    };//}}}
    function loadTemplate(me, inTpl) {//{{{
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
        me.argList = getArguments(me);
        me.argIdx = hlp.indexArgs(me.argList);
        me.hooks = me.source.hooks || [];
        return inTpl;
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
    function src2tpl(src) { // Ensures sqltt instance{{{
        if ( // Allow source too:
            typeof src.sql == "function"
            && ! src.getSource // sqltt objects has a sql() function too...
        ) {
            src = new sqltt(src);
        };
        return src;
    };//}}}
    const cliMode = (...args)=>require("./lib/cli_mode").bind(sqltt)(...args);


    // Constructor:
    // ------------

    function sqltt(sourceTpl, options = {}) {//{{{
        const me = this;
        me.version = D.version;
        me[D.sym_options] = options;
        loadTemplate(me, sourceTpl);
        checkTemplate(me);
        me.sqlCache = {};
    };//}}}


    // Public methods:
    // ---------------

    sqltt.prototype.getSource = function getSource(engFlav) {//{{{
        const me = this;
        const src = Object.assign({}, me.source);
        if (engFlav && src.altsql && src.altsql[engFlav]) src.sql = src.altsql[engFlav];
        return src;
    };//}}}
    sqltt.prototype.sql = function sql(engName) {//{{{
        const me = this;
        const eng = engine.resolve(me, engName);
        if (me.sqlCache[eng.name] !== undefined) return me.sqlCache[eng.name];
        const qtpl = me.getSource(eng.flavour).sql;

        const outSql = eng.sqlWrapper.bind(me)(qtpl(new sqlCompiler(me, eng)));
        me.sqlCache[eng.name] = outSql;
        return outSql.replace(D.re_rowtrim, "");
    };//}}}
    sqltt.prototype.args = function args(data = {}) {//{{{
        const me = this;
        if (data instanceof Array) return data;
            // Accept regular positional parameters too
            // (No check is made in this case).
        return me.argList.map(k=>D.argParser(data[k]));
    };//}}}
    sqltt.prototype.concat = function concat(str) {//{{{
        const me = this;
        return Object.assign(
            Object.create(Object.getPrototypeOf(me))
            , me
            , { sql: (...args) => me.sql(...args) + str }
        );
    };//}}}
    sqltt.prototype.options = function concat(opts) {//{{{
        const me = this;
        const clone = Object.assign(
            Object.create(Object.getPrototypeOf(me))
            , me
        );
        clone[D.sym_options] = {...me[D.sym_options], ...opts};
        return clone;
    };//}}}


    // Static mehtods and properties:
    // ---------------

    sqltt.version = D.version;
    sqltt.publish = function publish(module, qSrc, options) {//{{{

        // Allow to use global options specially for multi-template files:
        if (options !== undefined) {
            if (qSrc instanceof sqltt) {
                qSrc = qSrc.options(options);
            } else {
                Object.keys(qSrc).map(function(key) {
                    return qSrc[key]=qSrc[key] instanceof Array
                        ? qSrc[key].map(q=>q.options(options))
                        : qSrc[key].options(options)
                    ;
                });
            };
        };

        // NOTE:
        // Arrays of templates are allowed in order to specify multiple queries
        // expected to execute in single transaction. Specially in databases
        // like Oracle which doesn't support complex CTE's.

        // Export for library usage:
        module.exports = qSrc;

        // CLI usage:
        if (isCli(module)) cliMode(qSrc);

    };//}}}

    return sqltt;

})();

module.exports = sqltt;

