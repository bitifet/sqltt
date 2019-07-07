const assert = require('assert');
const sqltt = require('../');
const re_whitespace = /[\s\n\r]+/gm;

// TO-DO list
// ==========
//
//   * Test engine selection:
//     - By environment var.
//     - By template default.
//     - By explicit specification (.sql(eng) / .args(eng))
//     - By absolute default ("default")
//
//   * Test *_nocli and nocli.

// Helpers
// =======


const supported_engines = [
    'default', 'cli',
    'postgresql', 'postgresql_cli',
    'oracle', 'oracle_cli',
];

function h_sql(src, engine) { // Tpl to SQL{{{
    const q = new sqltt(src);
    return q.sql(engine)
        .replace(re_whitespace, ' ')
        .trim()
    ;
};//}}}
function h_sqle(src) {//{{{
    return supported_engines
        .map(e=>e.toUpperCase()+": "+h_sql(src, e))
    ;
};//}}}
function h_arglist(src) { // Tpl to arguments list{{{
    const q = new sqltt(src);
    return q.argList;
};//}}}
function h_args(src, args) { // Tpl, argsObj to argsArr{{{
    const q = new sqltt(src);
    return q.args(args);
};//}}}

var m; // Just temporary message holder

describe('sqltt class', function() {

    const s0 = $=>$`
        select ${$.arg("foo")}, ${"bar"}, ${"baz"}
    `;

    describe("Basic testing", function() {//{{{

        it ('Contrructs well', function() {//{{{
            assert.doesNotThrow(function() {
                new sqltt (s0);
            });
        });//}}}

        it ('Should have .getSource()', function() {//{{{
            assert.equal(typeof (new sqltt(s0)).getSource, "function");
        });//}}}

    });//}}}


    describe("Supported DB Engines", function() {//{{{

        it ('Default', function() {//{{{
            assert.equal(
                h_sql(s0)
                , "select $1, $2, $3" // TODO: Move to ANSI SQL
            );
            assert.equal(
                h_sql(s0, "cli")
                , "select :foo, :bar, :baz"
                    // TODO: Move to ANSI SQL
            );
        });//}}}

        it ('PostgreSQL', function() {//{{{

            assert.equal(
                h_sql(s0, "postgresql")
                , "select $1, $2, $3"
            );
            assert.equal(
                h_sql(s0, "postgresql_cli")
                , "select :foo, :bar, :baz"
            );

        });//}}}

        it ('Oracle', function() {//{{{

            assert.equal(
                h_sql(s0, "oracle")
                , "select :1, :2, :3"
            );

            assert.equal(
                h_sql(s0, "oracle_cli")
                , "select '&foo', '&bar', '&baz' ;"
            );
        });//}}}

    });//}}}



    describe('Template API', function() {

    });

    describe('Tag API', function() {

        it ('.arg()', function() {

            m = "Simple case";//{{{
            assert.deepStrictEqual(
                h_sqle($=>$`s ${$.arg("foo")} f`)
                , [
                    "DEFAULT: s $1 f",
                    "CLI: s :foo f",
                    "POSTGRESQL: s $1 f",
                    "POSTGRESQL_CLI: s :foo f",
                    "ORACLE: s :1 f",
                    "ORACLE_CLI: s '&foo' f;",
                ]
                , m
            );//}}}

            m = "Shorthand";//{{{
            assert.deepStrictEqual(
                h_sqle($=>$`s ${"foo"} f`)
                , h_sqle($=>$`s ${$.arg("foo")} f`)
                , m
            );//}}}

            m = "Aliased";//{{{
            assert.deepStrictEqual(
                h_sqle($=>$`s ${$.arg("foo", "fooAlias")} f`)
                , [
                    "DEFAULT: s $1 fooAlias f",
                    "CLI: s :foo fooAlias f",
                    "POSTGRESQL: s $1 fooAlias f",
                    "POSTGRESQL_CLI: s :foo fooAlias f",
                    "ORACLE: s :1 fooAlias f",
                    "ORACLE_CLI: s '&foo' fooAlias f;",
                ]
                , m
            );//}}}

            m = "Object enhnanced";//{{{
            assert.deepStrictEqual(
                h_sqle($=>$`s ${$.arg({foo: "fooAlias", bar: true, baz: false})} f`)
                , [
                    "DEFAULT: s $1 fooAlias, $2 bar, $3 f",
                    "CLI: s :foo fooAlias, :bar bar, :baz f",
                    "POSTGRESQL: s $1 fooAlias, $2 bar, $3 f",
                    "POSTGRESQL_CLI: s :foo fooAlias, :bar bar, :baz f",
                    "ORACLE: s :1 fooAlias, :2 bar, :3 f",
                    "ORACLE_CLI: s '&foo' fooAlias, '&bar' bar, '&baz' f;",
                ]
                , m
            );//}}}

            m = "Array enhnanced whithout alias";//{{{
            assert.deepStrictEqual(
                h_sqle($=>$`s ${$.arg(["foo", "bar", "baz"])} f`)
                , [
                    "DEFAULT: s $1, $2, $3 f",
                    "CLI: s :foo, :bar, :baz f",
                    "POSTGRESQL: s $1, $2, $3 f",
                    "POSTGRESQL_CLI: s :foo, :bar, :baz f",
                    "ORACLE: s :1, :2, :3 f",
                    "ORACLE_CLI: s '&foo', '&bar', '&baz' f;",
                ]
                , m
            );//}}}

            m = "Array enhnanced (explicitly) whithout alias";//{{{
            assert.deepStrictEqual(
                h_sqle($=>$`s ${$.arg(["foo", "bar", "baz"], false)} f`)
                , h_sqle($=>$`s ${$.arg(["foo", "bar", "baz"])} f`)
                , m
            );//}}}

            m = "Array enhnanced whith alias";//{{{
            assert.deepStrictEqual(
                h_sqle($=>$`s ${$.arg(["foo", "bar", "baz"], true)} f`)
                , [
                    "DEFAULT: s $1 foo, $2 bar, $3 baz f",
                    "CLI: s :foo foo, :bar bar, :baz baz f",
                    "POSTGRESQL: s $1 foo, $2 bar, $3 baz f",
                    "POSTGRESQL_CLI: s :foo foo, :bar bar, :baz baz f",
                    "ORACLE: s :1 foo, :2 bar, :3 baz f",
                    "ORACLE_CLI: s '&foo' foo, '&bar' bar, '&baz' baz f;",
                ]
                , m
            );//}}}

        });

    });

    describe('Other tests...', function() {

        it ('Arguments interpolation methods', function() {//{{{

            const q = $=>$`s ${"foo"}, ${$.arg("bar")}, ${$.arg(["baz1", "baz2"])}, ${["baz3", "baz4"]} f`;

            assert.equal(
                h_sql(q)
                , "s $1, $2, $3, $4, $5, $6 f"
            );
            assert.equal(
                h_sql(q, "postgresql")
                , "s $1, $2, $3, $4, $5, $6 f"
            );
            assert.equal(
                h_sql(q, "oracle")
                , "s :1, :2, :3, :4, :5, :6 f"
            );
            assert.deepStrictEqual(
                h_arglist(q)
                ,  ["foo", "bar", "baz1", "baz2", "baz3", "baz4"]
            );

            assert.deepStrictEqual(
                h_args(q, {foo: "fooArg", baz1: "baz1Arg"})
                ,  ["fooArg", null, "baz1Arg", null, null, null]
                , "Argument list should be generated in right order"
            );


        });//}}}

        it ('Arguments order', function() {//{{{

            const q = {
                args: ['baz2', 'bar'],
                sql: $=>$`s ${"foo"}, ${"bar"}, ${"baz1"}, ${"baz2"} f`,
            };

            assert.deepStrictEqual(
                h_arglist(q)
                ,  ["baz2", "bar", "foo", "baz1"]
                , "Specified arguments order must be respected"
            )
            assert.deepStrictEqual(
                h_args(q, {foo: "fooArg", baz1: "baz1Arg"})
                ,  [null, null, "fooArg", "baz1Arg"]
                , "Argument list should be generated in right order"
            )

        });//}}}

        it ('Literals interpolation method', function() {//{{{

            const q = $=>$`s ${$.literal("foo")}, ${$.literal(["bar", "baz1"])}, ${[$.literal("baz2"), $.literal("baz3")]} f`;
            assert.deepStrictEqual(
                h_sql(q)
                , "s foo, bar, baz1, baz2, baz3 f"
            );

        });//}}}

        it ('Subtemplates ($.include()) interpolation method', function() {//{{{
            const i1 = {sql: $=>$`s ${"i1a1"}, ${"i1a2"} f`, alias: "subq1"};
            const i2 = {sql: $=>$`s ${"i2a1"}, ${"i2a2"} f`, alias: "subq2"};
            const q1 = $=>$`s (${$.include(i1, {i1a2: "'fixed_value'"})}) as subq1 f`;
            const q2 = $=>$`s ${$.include([i1, i2], {i1a2: "'fixed_value'"})} f`;
            const q3 = $=>$`s * f ${$.include(q1)} as supernest`;

            // q1:
            assert.equal(
                h_sql(q1)
                , "s (s $1, 'fixed_value' f) as subq1 f"
            );
            // q2:
            assert.equal(
                h_sql(q2)
                , "s (s $1, 'fixed_value' f) as subq1, (s $2, $3 f) as subq2 f"
            );
            assert.equal(
                h_sql(q2, "oracle")
                , "s (s :1, 'fixed_value' f) subq1, (s :2, :3 f) subq2 f"
            );
            // q3:
            assert.equal(
                h_sql(q3)
                , "s * f s (s $1, 'fixed_value' f) as subq1 f as supernest"
            );

            assert.deepStrictEqual(
                h_arglist(q2)
                ,  ["i1a1", "i2a1", "i2a2"]
            );
            assert.deepStrictEqual(
                h_args(q2, {i1a2: "IwontAppear", i2a2: "second"})
                ,  [null, null, "second"]
                , "Argument list should be generated in right order"
            );

        });//}}}

    });

});


