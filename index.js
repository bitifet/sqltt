"use strict";
const hlp = require("./lib/helpers");
const engines = require("./lib/engines");

function resolveEngine(eng) {//{{{

    const isCli = (eng || "").match(/^(?:(\w+)_)?cli$/);
    let cliArgs;
    if (isCli) cliArgs = process.argv.slice(2);

    if (eng == "cli") { 
        let requestedEngine = (
            (cliArgs[0] || "").match(/^--(\w+)$/)
            || []
        )[1];
        if (requestedEngine) {
            cliArgs.shift();
            eng = requestedEngine+"_cli";
        };


    };

    let targetEng = eng;
    if (isCli && ! engines[eng]) {
        console.error(
            "-- Unknown/Unimplemented cli engine: "
            + eng
            + ". Using default..."
        );
        eng = "cli";
    };

    const engine = engines[eng];
    if (! engine) throw new Error ("Unknown database engine: " + eng);

    return [engine, eng, targetEng, cliArgs];
};//}}}

class sqlst { // Sql Template
    constructor(sourceTpl, options = {}) {//{{{
        const me = this;

        me.source = sourceTpl;

        me.argList = hlp.getArguments(me.source);
        me.argIdx = hlp.indexArgs(me.argList);

        const {
            hooks
        } = me.source(()=>{})
        me.hooks = hooks;

    };//}}}
    getSource() {//{{{
        const me = this;
        return me.source;
    };//}}}
    hookApply(eng, arg, rarg) {//{{{
        const me = this;
        const hook = me.hooks[arg];
        if (! hook) return arg;
        const hookt = typeof hook;
        if (hookt == "function") return hook(rarg, eng) || rarg;
        if (hookt == "string") return hook.replace(/%/g, rarg);
        throw new Error ("Invalid hook type: " + hookt);
    };//}}}
    sql(engName = "default") {//{{{
        const me = this;

        const [engine, eng, targetEngine, args] = resolveEngine(engName);

        function compiler(parts, ...placeholders) {//{{{
            const sql = [];
            const literals = this;

            function interpolate(plh, i, bindings = {}) {//{{{
                switch (typeof plh) {
                    case "string":
                        return me.hookApply(
                            targetEngine
                            , plh
                            , literals[plh] === undefined
                                ? engine.indexer(me.argIdx[plh], plh)
                                : literals[plh]
                        );
                    case "function": // Template source:
                        return plh(compiler.bind(bindings)).sql;
                    case "object":   // Actual sqlst instance:
                        if (
                            plh instanceof Array
                        ) {
                            if (typeof plh[0] == "string") {
                                return me.hookApply(targetEngine, plh[0], plh[0]);
                            };
                            return interpolate(plh[0], i, plh[1]);
                        } else if (
                            "function" == typeof plh.getSource
                        ) {
                            return plh.getSource()(compiler.bind(bindings)).sql;
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

        return engine.wrapper.bind(me)(me.source(compiler.bind({})).sql, args);
    };//}}}
    args(data = {}) {//{{{
        if (data instanceof Array) return data;
            // Accept regular positional parameters too
            // (No check is made in this case).
        return this.argList.map(k=>data[k] || null);
    };//}}}
}

module.exports = sqlst;

