"use strict";
const hlp = require("./lib/helpers");
const engines = require("./lib/engines");

class sqlst { // Sql Template
    constructor(sourceTpl, options = {}) {//{{{
        const me = this;

        me.source = sourceTpl;

        me.argList = hlp.getArguments(me.source);
        me.argIdx = hlp.indexArgs(me.argList);

    };//}}}
    getSource() {//{{{
        const me = this;
        return me.source;
    };//}}}
    sql(eng = "default") {//{{{
        const me = this;
        const engine = engines[eng];
        if (! engine) throw new Error ("Unknown database engine: " + eng);

        function compiler(parts, ...placeholders) {//{{{
            const sql = [];
            const literals = this;

            function interpolate(plh, i, bindings = {}) {//{{{
                switch (typeof plh) {
                    case "string":
                        return (
                            literals[plh] === undefined
                                ? engine.indexer(me.argIdx[plh], plh)
                                : literals[plh]
                        );
                    case "function": // Template source:
                        return plh(compiler.bind(bindings)).sql;
                    case "object":   // Actual sqlst instance:
                        if (
                            plh instanceof Array
                        ) {
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

        return engine.wrapper.bind(me)(me.source(compiler.bind({})).sql);
    };//}}}
    args(data = {}) {//{{{
        if (data instanceof Array) return data;
            // Accept regular positional parameters too
            // (No check is made in this case).
        return this.argList.map(k=>data[k] || null);
    };//}}}
}

module.exports = sqlst;

