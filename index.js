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


        class argCompiler {

            constructor() {
                const self = this;

                function acompile(parts, ...placeholders){//{{{
                    if (! self.literals) self.literals = {};
                    function interpolate (plh, i, bindings = {}) {
                        switch (typeof plh) {
                            case "string":
                                return self.arg(plh);
                            case "function": // (Old Style) template source:
                                return plh.sql(acompile.bind(self.bindings));
                            case "object":   // Actual sqltt instance:
                                if (plh instanceof Array) {
                                    if (typeof plh[0] == "string") return self.literal(plh[0]);
                                        // (Still) Allow ["foo"] to apply hooks avoiding argument interpolation.
                                    return interpolate(plh[0], i, plh[1]);
                                };

                                // Subtemplate:
                                // ------------
                                const subTpl = self.subTemplate(plh);
                                if (subTpl) return subTpl;

                                // RETURN!!!!    (FIXME!!!!!)
                                // That information is not caught whien invoked directly on the template!!!

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

                acompile.arg = self.arg.bind(self);
                acompile.literal = self.literal.bind(self);
                acompile.include = self.subTemplate.bind(self);

                return acompile;

            };

            arg(argName) {//{{{
                const self = this;
                if (! argName.length) throw new Error("Empty placehloder name is not allowed");
                return (
                    self.literals[argName] === undefined
                        ? argName
                        : null
                );
            };//}}}
            literal() {//{{{
                return null;
                // Ignore literals while parsing arguments.
            };//}}}
            subTemplate(src) {//{{{
                const self = this;
                if ( // Allow source too:
                    typeof src.sql == "function"
                    && ! src.getSource // sqltt objects has a sql() function too...
                ) {
                    src = new me.constructor(src);
                };

                // Actual sqltt instance:
                if ("function" == typeof src.getSource) {
                    self.literals = self.bindings; // FIXME (nesting...)
                    return src.getSource(engineFlavour).sql(new self.constructor());
                };
            };//}}}

        };


        const tplArgs = sourceTpl.sql(new argCompiler());
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



        class sqlCompiler {


            constructor() {
                const self = this;

                function scompiler(parts, ...placeholders) {//{{{
                    if (! self.literals) self.literals = {};
                    const sql = [];

                    function interpolate(plh, i, bindings = {}) {//{{{
                        self.bindings = bindings;
                        switch (typeof plh) {
                            case "undefined":
                                if (i == placeholders.length) return ""; // No placeholder at the very end.
                            case "string":
                                return self.arg(plh);
                            case "function": // (Old Style) template source:
                                return plh.sql(scompiler.bind(self.bindings));
                            case "object":   // Actual sqltt instance:
                                if (plh instanceof Array) {
                                    if (typeof plh[0] == "string") return self.literal(plh[0]);
                                    return interpolate(plh[0], i, plh[1]);
                                };

                                // Subtemplate:
                                // ------------
                                const subTpl = self.subTemplate(plh);
                                if (subTpl) return subTpl;
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
                return hookApply(
                    me
                    , targettedEngName
                    , argName
                    , self.literals[argName] === undefined
                        ? eng.indexer(me.argIdx[argName], argName)
                        : self.literals[argName]
                );
            };//}}}
            literal(str) {//{{{
                return hookApply(me, targettedEngName, str, str);
            };//}}}
            subTemplate(src) {//{{{
                const self = this;
                if ( // Allow source too:
                    typeof src.sql == "function"
                    && ! src.getSource // sqltt objects has a sql() function too...
                ) {
                    src = new me.constructor(src);
                };

                // Actual sqltt instance:
                if ("function" == typeof src.getSource) {
                    self.literals = self.bindings; // FIXME (nesting...)
                    return src.getSource(engineFlavour).sql(new self.constructor());
                };
            };//}}}


        };


        const outSql = eng.wrapper.bind(me)(sqlt(new sqlCompiler), args);
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

