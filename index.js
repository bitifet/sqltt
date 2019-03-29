"use strict";
const hlp = require("./lib/helpers");
const engines = require("./lib/engines");
const argParser = (v)=>v===undefined?null:v;

function resolveEngine(engName) {//{{{

    const isCli = (engName || "").match(/^(?:(\w+)_)?cli$/);
    let cliArgs;
    if (isCli) cliArgs = process.argv.slice(2);

    if (engName == "cli") {
        let requestedEngine = (
            (cliArgs[0] || "").match(/^--(\w+)$/)
            || []
        )[1];
        if (requestedEngine) {
            cliArgs.shift();
            engName = requestedEngine+"_cli";
        };


    };

    let targettedEngName = engName;
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

    return [eng, targettedEngName, engineFlavour, cliArgs];
};//}}}

const sqltt = (function(){ // Sql Tagged Template Engine

    // Private functions:
    // ------------------

    function hookApply(me, engName, arg, rarg) {//{{{
        const hook = me.hooks[arg];
        if (! hook) return rarg;
        const hookt = typeof hook;
        if (hookt == "function") return hook(rarg, engName) || rarg;
        if (hookt == "string") return hook.replace(/%/g, rarg);
        throw new Error ("Invalid hook type: " + hookt);
    };//}}}
    function getArguments(me, engineFlavour) {//{{{
        // Recursively retrieve arguments from template respecting
        // specified order (if given).
        const sourceTpl = me.getSource(engineFlavour);

        function argCompiler(parts, ...placeholders){//{{{
            const literals = this;
            function interpolate (plh, i, bindings = {}) {
                switch (typeof plh) {
                    case "string":
                        if (! plh.length) throw new Error("Empty placehloder name is not allowed");
                        return (
                            literals[plh] === undefined
                                ? plh
                                : null
                        );
                    case "object":   // Actual sqltt instance:
                        if (plh instanceof Array) {
                            if (typeof plh[0] == "string") return null;
                                // Allow ["foo"] to apply hooks avoiding argument interpolation.
                            return interpolate(plh[0], i, plh[1]);
                        };

                        // Subtemplate:
                        // ------------
                        if ( // Allow source too:
                            typeof plh.sql == "function"
                            && ! plh.getSource // sqltt objects has a sql() function too...
                        ) {
                            plh = new me.constructor(plh);
                        };

                        // Actual sqltt instance:
                        if ("function" == typeof plh.getSource) {
                            return plh.getSource(engineFlavour).sql(argCompiler.bind(bindings));
                        };
                        // ------------

                    default:
                        throw new Error("Wrong placehloder type: " + typeof plh);
                };
            }

            return placeholders
                .map(interpolate)
                .filter(x=>x!==null)
            ;
        };//}}}

        const tplArgs = sourceTpl.sql(argCompiler.bind({}));
        return hlp.sortArgs(
            sourceTpl.args || []
            , tplArgs
            , me.options.check_arguments
        );
    };//}}}
    function loadTemplate(me, inTpl) {//{{{
        if (typeof inTpl == "function") { // Backward Compatibility Hook{{{
            // Old Style template transpilation:
            const outTpl = inTpl(()=>{});
            if (typeof outTpl != "object") throw new Error (
                "Wrong old-style template format"
            );
            outTpl.sql = $=>inTpl($).sql;
            return loadTemplate(me, outTpl);
        };//}}}
        me.source = inTpl;
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
    sqltt.prototype.sql = function sql(engName = "default") {//{{{
        const me = this;
        if (me.sqlCache[engName] !== undefined) return me.sqlCache[engName];
        const [eng, targettedEngName, engineFlavour, args] = resolveEngine(engName);
        const sqlt = me.getSource(engineFlavour).sql;
        function compiler(parts, ...placeholders) {//{{{
            const sql = [];
            const literals = this;

            function interpolate(plh, i, bindings = {}) {//{{{
                switch (typeof plh) {
                    case "undefined":
                        if (i == placeholders.length) return ""; // No placeholder at the very end.
                    case "string":
                        return hookApply(
                            me
                            , targettedEngName
                            , plh
                            , literals[plh] === undefined
                                ? eng.indexer(me.argIdx[plh], plh)
                                : literals[plh]
                        );
                    case "function": // Template source:
                        return plh.sql(compiler.bind(bindings));
                    case "object":   // Actual sqltt instance:
                        if (plh instanceof Array) {
                            if (typeof plh[0] == "string") {
                                return hookApply(me, targettedEngName, plh[0], plh[0]);
                            };
                            return interpolate(plh[0], i, plh[1]);
                        };

                        // Subtemplate:
                        // ------------
                        if ( // Allow source too:
                            typeof plh.sql == "function"
                            && ! plh.getSource // sqltt objects has a sql() function too...
                        ) {
                            plh = new me.constructor(plh);
                        };

                        // Actual sqltt instance:
                        if ("function" == typeof plh.getSource) {
                            return plh.getSource(engineFlavour).sql(compiler.bind(bindings));
                        };
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
        const outSql = eng.wrapper.bind(me)(sqlt(compiler.bind({})), args);
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

