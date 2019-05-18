"use strict";
const ENGINE_ENV_VAR = 'SQLTT_ENGINE';
const hlp = require("./lib/helpers");
const engines = require("./lib/engines");
const argParser = (v)=>v===undefined?null:v;
const interpolation = require("./lib/interpolation");
const argCompiler = require("./lib/argCompiler");
const sqlCompiler = require("./lib/sqlCompiler");

function resolveEngine(engName) {//{{{

    const targettedEngName = engName;
    const isCli = (targettedEngName || "").match(/^(?:(\w+)_)?cli$/);

    if (engName == "cli") {
        const requestedEngine = process.env[ENGINE_ENV_VAR];
        if (requestedEngine) engName = requestedEngine+"_cli";
    };

    if (isCli && ! engines[engName]) {
        console.error(
            "-- Unknown/Unimplemented cli engine: "
            + engName
            + ". Using default..."
        );
        engName = "cli";
    };

    const eng = engines[engName];
    if (! eng) throw new Error ("Unknown database engine: " + engName);

    const engineFlavour = targettedEngName.replace("_cli", "");

    return [eng, targettedEngName, engineFlavour];

};//}}}


const sqltt = (function(){ // Sql Tagged Template Engine

    // Private functions:
    // ------------------

    function getArguments(me, engineFlavour) {//{{{
        // Recursively retrieve arguments from template respecting
        // specified order (if given).
        const sourceTpl = me.getSource(engineFlavour);
        const tplArgs = sourceTpl.sql(
            new argCompiler(me, engineFlavour)
        );
        return hlp.sortArgs(
            sourceTpl.args || []
            , typeof tplArgs == "object" ? tplArgs : []
            , me.options.check_arguments
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
            me.source.sql = ()=>sqlStr;
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
            for (let engName in me.source.altsql) {
                if (typeof me.source.altsql[engName] != "function") throw new Error (
                    "Wrong template format: alternative sql for "+engName+" must be a function."
                );
                const args = getArguments(me, engName);
                if (JSON.stringify(args) !== mainArgs) throw new Error (
                    "Arguments mismatch in alternative sql for "+engName+"."
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

    // Constructor:
    // ------------

    function sqltt(sourceTpl, options = {}) {//{{{
        const me = this;
        me.options = options;
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
    sqltt.prototype.sql = function sql(engName = "default", cliArgs = []) {//{{{
        const me = this;
        if (me.sqlCache[engName] !== undefined) return me.sqlCache[engName];
        const engInfo = resolveEngine(engName);
        const [eng, targettedEngName, engineFlavour] = engInfo;
        const sqlt = me.getSource(engineFlavour).sql;

        const outSql = eng.wrapper.bind(me)(sqlt(new sqlCompiler(me, engInfo)), cliArgs);
        me.sqlCache[engName] = outSql;
        return outSql;
    };//}}}
    sqltt.prototype.args = function args(data = {}) {//{{{
        const me = this;
        if (data instanceof Array) return data;
            // Accept regular positional parameters too
            // (No check is made in this case).
        return me.argList.map(k=>argParser(data[k]));
    };//}}}
    sqltt.prototype.concat = function concat(str) {//{{{
        const me = this;
        return Object.assign(
            Object.create(Object.getPrototypeOf(me))
            , me
            , { sql: (...args) => me.sql(...args) + str }
        );
    };//}}}
    sqltt.prototype.split = function split(engFlav) {//{{{
        const me = this;
        const src = me.getSource(engFlav);
        const opts = Object.assign({}
            , me.options
            , {check_arguments: false}
        );
        const sqlarr = hlp.qSplit(src.sql);
        return sqlarr.map(function (sql) {
            return new sqltt(Object.assign({}
                , src
                , {sql, altsql:{}}
            ), opts)
        });
    };//}}}

    return sqltt;

})();

module.exports = sqltt;

