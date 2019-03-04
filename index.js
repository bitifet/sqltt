"use strict";
const hlp = require("./lib/helpers");
const engines = require("./lib/engines");

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

class sqlst { // Sql Template
    constructor(sourceTpl, options = {}) {//{{{
        const me = this;
        me.loadTemplate(sourceTpl);
        me.checkTemplate();
    };//}}}
    getSource(engFlav) {//{{{
        const me = this;
        const src = Object.assign({}, me.source);
        if (engFlav && src.altsql && src.altsql[engFlav]) src.sql = src.altsql[engFlav];
        return src;
    };//}}}
    hookApply(engName, arg, rarg) {//{{{
        const me = this;
        const hook = me.hooks[arg];
        if (! hook) return rarg;
        const hookt = typeof hook;
        if (hookt == "function") return hook(rarg, engName) || rarg;
        if (hookt == "string") return hook.replace(/%/g, rarg);
        throw new Error ("Invalid hook type: " + hookt);
    };//}}}
    sql(engName = "default") {//{{{
        const me = this;
        const [eng, targettedEngName, engineFlavour, args] = resolveEngine(engName);
        const sqlt = me.getSource(engineFlavour).sql;
        function compiler(parts, ...placeholders) {//{{{
            const sql = [];
            const literals = this;

            function interpolate(plh, i, bindings = {}) {//{{{
                switch (typeof plh) {
                    case "string":
                        return me.hookApply(
                            targettedEngName
                            , plh
                            , literals[plh] === undefined
                                ? eng.indexer(me.argIdx[plh], plh)
                                : literals[plh]
                        );
                    case "function": // Template source:
                        return plh.sql(compiler.bind(bindings));
                    case "object":   // Actual sqlst instance:
                        if (
                            plh instanceof Array
                        ) {
                            if (typeof plh[0] == "string") {
                                return me.hookApply(targettedEngName, plh[0], plh[0]);
                            };
                            return interpolate(plh[0], i, plh[1]);
                        } else if (
                            "function" == typeof plh.getSource
                        ) {
                            return plh.getSource(engineFlavour).sql(compiler.bind(bindings));
                        };
                    case "undefined":
                        if (i == placeholders.length) return ""; // No placeholder at the very end.
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
        return eng.wrapper.bind(me)(sqlt(compiler.bind({})), args);
    };//}}}
    args(data = {}) {//{{{
        if (data instanceof Array) return data;
            // Accept regular positional parameters too
            // (No check is made in this case).
        return this.argList.map(k=>data[k] || null);
    };//}}}
    getArguments(engineFlavour) {//{{{
        // Recursively retrieve arguments from template respecting
        // specified order (if given).
        const me = this;
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
                    case "object":   // Actual sqlst instance:
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
        return Array.from(
            new Set(hlp.flatten([...(sourceTpl.args || []), ...tplArgs]))
        );
    };//}}}
    loadTemplate(inTpl) {//{{{
        const me = this;
        if (typeof inTpl == "function") { // Backward Compatibility Hook{{{
            // Old Style template transpilation:
            const outTpl = inTpl(()=>{});
            if (typeof outTpl != "object") throw new Error (
                "Wrong old-style template format"
            );
            outTpl.sql = $=>inTpl($).sql;
            return me.loadTemplate(outTpl);
        };//}}}
        me.source = inTpl;
        me.argList = me.getArguments();
        me.argIdx = hlp.indexArgs(me.argList);
        me.hooks = me.source.hooks || [];
        return inTpl;
    };//}}}
    checkTemplate() {//{{{
        const me = this;
        if (typeof me.source.sql != "function") throw new Error (
            "Wrong template format: sql must be a function."
        );
        if (typeof me.source.altsql == "object") {
            const mainArgs = JSON.stringify(me.argList);
            for (let engName in me.source.altsql) {
                if (typeof me.source.altsql[engName] != "function") throw new Error (
                    "Wrong template format: alternative sql for "+engName+" must be a function."
                );
                const args = me.getArguments(engName);
                if (JSON.stringify(args) !== mainArgs) throw new Error (
                    "Arguments mismatch in alternative sql for "+engName+"."
                );
            };
        };

    };//}}}
}

module.exports = sqlst;

