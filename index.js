"use strict";
const ENGINE_ENV_VAR = 'SQLTT_ENGINE';
const hlp = require("./lib/helpers");
const engines = require("./lib/engines");
const argParser = (v)=>v===undefined?null:v;
const interpolation = require("./lib/interpolation");
const argCompiler = require("./lib/argCompiler");
const sqlCompiler = require("./lib/sqlCompiler");
const re_cli = /(?:^|_)((?:no)?cli)$/;
const re_rowtrim = /^(?:\s*\n)*|(?:\n\s*)*$/g;
const $options$ = Symbol();
const Fs = require("fs");
const SQLTT_VERSION = JSON.parse(
    Fs.readFileSync(__dirname + "/package.json")
).version;



const sqltt = (function(){ // Sql Tagged Template Engine

    // Private functions:
    // ------------------

    function resolveEngine(me, engName0 = "") {//{{{

        let isCli = false;

        const [
            tplDefault,
            engName,
            envDefault,
        ] = [
            me[$options$].default_engine,
            engName0,
            process.env[ENGINE_ENV_VAR],
        ]
            .map(function update_isCli(str) {
                const m = (str || "").match(re_cli);
                if (m) isCli = m[1] == "cli";
                return str; // Pass through
            })
            .map(function pickFlavour(str) {
                return (str||"").replace(re_cli, "")
            })
        ;

        const flavour = engName || envDefault || tplDefault || "default";
        let name = isCli
            ? flavour+"_cli"
            : flavour.replace(re_cli, "")
        ;

        if (isCli && ! engines[name]) {
            console.error(
                "-- Unknown/Unimplemented cli engine: "
                + name
                + ". Using default..."
            );
            name = "default_cli";
        };

        const eng = engines[name];
        if (! eng) throw new Error ("Unknown database engine: " + name);

        return Object.assign({
            name,
            flavour,
        }, eng);

    };//}}}
    function getArguments(me, engName) {//{{{
        // Recursively retrieve arguments from template respecting
        // specified order (if given).
        const eng = resolveEngine(me, engName);
        const sourceTpl = me.getSource(eng.flavour);
        const tplArgs = sourceTpl.sql(
            new argCompiler(me, eng) ///// FIXME: Check if it is inexcusable to pick for engine for arguments.
        );
        return hlp.sortArgs(
            sourceTpl.args || []
            , typeof tplArgs == "object" ? tplArgs : []
            , me[$options$].check_arguments
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

    // Constructor:
    // ------------

    function sqltt(sourceTpl, options = {}) {//{{{
        const me = this;
        me.version = SQLTT_VERSION;
        me[$options$] = options;
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
    sqltt.prototype.sql = function sql(engName, cliArgs = []) {//{{{
        const me = this;
        const eng = resolveEngine(me, engName);
        if (me.sqlCache[eng.name] !== undefined) return me.sqlCache[eng.name];
        const qtpl = me.getSource(eng.flavour).sql;

        const outSql = eng.wrapper.bind(me)(qtpl(new sqlCompiler(me, eng)), cliArgs);
        me.sqlCache[eng.name] = outSql;
        return outSql.replace(re_rowtrim, "");
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
    sqltt.prototype.options = function concat(opts) {//{{{
        const me = this;
        const clone = Object.assign(
            Object.create(Object.getPrototypeOf(me))
            , me
        );
        clone[$options$] = {...me[$options$], ...opts};
        return clone;
    };//}}}
    sqltt.prototype.split = function split(engFlav) {//{{{
        const me = this;
        const src = me.getSource(engFlav);
        const opts = Object.assign({}
            , me[$options$]
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


    // Static mehtods and properties:
    // ---------------

    sqltt.version = SQLTT_VERSION;
    sqltt.publish = function publish(module, qSrc, options) {//{{{
        if (options !== undefined) {    // Library usage
            if (qSrc instanceof sqltt) {
                qSrc = qSrc.options(options);
            } else {
                Object.keys(qSrc).map(
                    (key)=>qSrc[key]=qSrc[key].options(options)
                );
            };
        };
        module.exports = qSrc;
        if (! module.parent) {    // CLI usage
            const args = process.argv.slice(2); // Get shell arguments.
            if (qSrc instanceof sqltt) {
                console.log(qSrc.sql('cli', process.argv.slice(2)));
            } else {
                const qId = args.shift()        // Extract first as query id.
                if (! qId || ! qSrc[qId]) { // Unexistent query or unspecified.
                    // List available ones:
                    console.log ("Available queries: " + Object.keys(qSrc).join(", "));
                } else {
                    // Render selected query:
                    console.log (qSrc[qId].sql('cli', args));
                };
            };
        };
    };//}}}

    return sqltt;

})();

module.exports = sqltt;

