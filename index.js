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

            for (let i=0; i<parts.length; i++) {
                sql.push(parts[i]);
                const plh = placeholders[i];
                switch (typeof plh) {
                    case "string":
                        sql.push(engine.indexer(me.argIdx[plh], plh));
                        break;
                    case "function": // Template source:
                        sql.push(plh(compiler).sql);
                        break;
                    case "object":   // Actual sqlst instance:
                        if ("function" == typeof plh.getSource) {
                            sql.push(plh.getSource()(compiler).sql);
                            break;
                        };
                    case "undefined":
                        if (i == placeholders.length) break; // No placeholder at the very end.
                    default:
                        throw new Error("Wrong placehloder type: " + typeof plh);
                };
            };

            return sql.join("");
        };//}}}

        return engine.wrapper.bind(me)(me.source(compiler).sql);
    };//}}}
    args(data = {}) {//{{{
        return this.argList.map(k=>data[k] || null);
    };//}}}
}

module.exports = sqlst;

