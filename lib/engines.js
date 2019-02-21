"use strict";

const defaultEngine = {//{{{
    indexer: i=>('$'+i),
    wrapper: s=>s,
}//}}}

const defaultCli = Object.assign (//{{{
    {}
    , defaultEngine
    , {
        indexer: (i,n)=>(':'+n),
        wrapper: function(sql) {
            const me = this;
            return me.argList.map(
                    (a,i)=>"\\set "+a+" '''"+process.argv[i+2]+"'''"
                ).join("\n")
                + sql
            ;

        },
    }
)//}}}

const postgresql = Object.assign (//{{{
    {}
    , defaultEngine
);//}}}

const postgresqlcli = Object.assign (//{{{
    {}
    , defaultCli
);//}}}

const oracle = Object.assign (//{{{
    {}
    , defaultEngine
    , {
        indexer: i=>(':'+i),
    },
);//}}}

module.exports = {
    default: defaultEngine,
    cli: defaultCli,
    postgresql,
    postgresqlcli,
    oracle,
};
