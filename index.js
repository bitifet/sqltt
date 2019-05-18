"use strict";
const hlp = require("./lib/helpers");
const engines = require("./lib/engines");
const argParser = (v)=>v===undefined?null:v;
const ENGINE_ENV_VAR = 'SQLTT_ENGINE';

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

class interpolation {//{{{
    constructor(value) {
        this.data = {
            value: value,
            wrap: false,
            alias: false,
        };
    };
    wrap(alias) {
        this.data.wrap = true;
        this.data.alias = alias;
        return this;
    };
    render() {
        const aliasStr = this.data.alias
            ? " " + this.data.alias
            : ""
        ;
        return this.data.wrap
            ? "("+this.data.value+")" + aliasStr
            : this.data.value
        ;
    };
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

            constructor(literals = {}) {
                const self = this;
                self.literals = literals;

                function acompile(parts, ...placeholders){//{{{
                    function interpolate (plh, i, bindings = {}) {//{{{
                        if (plh instanceof interpolation) return plh.render();
                        switch (typeof plh) {
                            case "string":
                                return self.arg(plh).render();
                            case "object":   // Actual sqltt instance:
                                if (plh instanceof Array) {
                                    return plh
                                        .map(interpolate)
                                    ;
                                };

                                // Subtemplate:
                                // ------------
                                const subTpl = self.subTemplate(plh);
                                if (subTpl) return subTpl.render();
                                // ------------

                            default:
                                throw new Error("Wrong placehloder type: " + typeof plh);
                        };
                    };//}}}
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
                if (argName instanceof Array) return argName.map(self.arg.bind(self));
                if (! argName.length) throw new Error("Empty placehloder name is not allowed");
                return new interpolation (
                    self.literals[argName] === undefined
                        ? argName
                        : null
                );
            };//}}}
            literal() {//{{{
                return new interpolation(null);
                // Ignore literals while parsing arguments.
            };//}}}
            subTemplate(src, bindings) {//{{{
                const self = this;
                if (src instanceof Array) return src.map(s=>self.subTemplate(s, bindings));
                if ( // Allow source too:
                    typeof src.sql == "function"
                    && ! src.getSource // sqltt objects has a sql() function too...
                ) {
                    src = new me.constructor(src);
                };

                // Actual sqltt instance:
                if ("function" == typeof src.getSource) {
                    return new interpolation (
                        src.getSource(engineFlavour).sql(new self.constructor(bindings))
                    );
                };

            };//}}}

        };

        const tplArgs = sourceTpl.sql(new argCompiler());
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
        const [eng, targettedEngName, engineFlavour] = resolveEngine(engName);
        const sqlt = me.getSource(engineFlavour).sql;

        class sqlCompiler {//{{{


            constructor(literals = {}) {
                const self = this;
                self.literals = literals;

                function scompiler(parts, ...placeholders) {//{{{
                    const sql = [];

                    function interpolate(plh, i) {//{{{
                        if (plh instanceof interpolation) return plh.render();
                        switch (typeof plh) {
                            case "undefined":
                                if (i == placeholders.length) return ""; // No placeholder at the very end.
                            case "string":
                                return self.arg(plh).render();
                            case "object":   // Actual sqltt instance:
                                if (plh instanceof Array) {
                                    return plh
                                        .map(interpolate)
                                        .join(", ")
                                    ;
                                };

                                // Subtemplate:
                                // ------------
                                const subTpl = self.subTemplate(plh);
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

                scompiler.arg = self.arg.bind(self);
                scompiler.literal = self.literal.bind(self);
                scompiler.include = self.subTemplate.bind(self);

                return scompiler;

            };

            arg(argName) {//{{{
                const self = this;
                if (argName instanceof Array) return argName.map(s=>self.arg(s).wrap());
                return new interpolation (
                    hookApply (
                        me
                        , targettedEngName
                        , argName
                        , self.literals[argName] === undefined
                            ? eng.indexer(me.argIdx[argName], argName)
                            : self.literals[argName]
                    )
                );
            };//}}}
            literal(str) {//{{{
                const self = this;
                if (str instanceof Array) return str.map(s=>self.literal(s).wrap());
                return new interpolation (
                    hookApply(me, targettedEngName, str, str)
                );
            };//}}}
            subTemplate(src, bindings = {}) {//{{{
                const self = this;
                if (src instanceof Array) return src
                    .map(src2tpl)
                    .map(
                        s=>self
                            .subTemplate(s, bindings)
                            .wrap(eng.alias(s.getSource().alias))
                    )
                ;
                src = src2tpl(src);
                // Actual sqltt instance:
                if ("function" == typeof src.getSource) {
                    const str = src.getSource(engineFlavour).sql(new self.constructor(bindings));
                    return new interpolation (
                        str
                    );
                };
            };//}}}

        };//}}}

        const outSql = eng.wrapper.bind(me)(sqlt(new sqlCompiler), cliArgs);
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

