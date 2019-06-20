const assert = require('assert');
const sqltt = require('../');

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

function hsql(src, engine) { // Tpl to SQL{{{
    const q = new sqltt(src);
    return q.sql(engine);
};//}}}
function hargl(src) { // Tpl to arguments list{{{
    const q = new sqltt(src);
    return q.argList;
};//}}}
function hargs(src, args) { // Tpl, argsObj to argsArr{{{
    const q = new sqltt(src);
    return q.args(args);
};//}}}


describe('sqltt class', function() {

    describe("Basic testing", function() {//{{{
        it ('Should have .getSource()', function() {
            var q;

            assert.doesNotThrow(function(){
                q = new sqltt("foobar");
            }, "Does not accept simple string as template");
            assert.equal(typeof q.getSource, "function");
        });
    });//}}}

    describe('"Tag" methods', function() {

        it ('Acceptable template formats', function() {//{{{
            var q;

            assert.doesNotThrow(function() {
                q = new sqltt (
                    $=>$`
                        select ${$.arg("foo")}, ${"bar"}, ${"baz"}
                    `
                );
            });


            assert.equal("select $1, $2, $3", q.sql().trim());
            assert.equal("select $1, $2, $3", q.sql("postgresql").trim());
            assert.equal("select :1, :2, :3", q.sql("oracle").trim());

        });//}}}

        it ('Arguments interpolation methods', function() {//{{{

            const q = $=>$`s ${"foo"}, ${$.arg("bar")}, ${$.arg(["baz1", "baz2"])}, ${["baz3", "baz4"]} f`;
            assert.equal(
                hsql(q)
                , "s $1, $2, $3, $4, $5, $6 f"
            );
            assert.equal(
                hsql(q, "postgresql")
                , "s $1, $2, $3, $4, $5, $6 f"
            );
            assert.equal(
                hsql(q, "oracle")
                , "s :1, :2, :3, :4, :5, :6 f"
            );
            assert.deepStrictEqual(
                hargl(q)
                ,  ["foo", "bar", "baz1", "baz2", "baz3", "baz4"]
            );
            assert.deepStrictEqual(
                hargs(q, {foo: "fooArg", baz1: "baz1Arg"})
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
                hargl(q)
                ,  ["baz2", "bar", "foo", "baz1"]
                , "Specified arguments order must be respected"
            )
            assert.deepStrictEqual(
                hargs(q, {foo: "fooArg", baz1: "baz1Arg"})
                ,  [null, null, "fooArg", "baz1Arg"]
                , "Argument list should be generated in right order"
            )

        });//}}}

        it ('Literals interpolation method', function() {//{{{

            const q = $=>$`s ${$.literal("foo")}, ${$.literal(["bar", "baz1"])}, ${[$.literal("baz2"), $.literal("baz3")]} f`;
            assert.equal(
                hsql(q)
                , "s foo, (bar), (baz1), baz2, baz3 f"
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
                hsql(q1)
                , "s (s $1, 'fixed_value' f) as subq1 f"
            );
            // q2:
            assert.equal(
                hsql(q2)
                , "s (s $1, 'fixed_value' f) as subq1, (s $2, $3 f) as subq2 f"
            );
            assert.equal(
                hsql(q2, "oracle")
                , "s (s :1, 'fixed_value' f) subq1, (s :2, :3 f) subq2 f"
            );
            // q3:
            assert.equal(
                hsql(q3)
                , "s * f s (s $1, 'fixed_value' f) as subq1 f as supernest"
            );

            assert.deepStrictEqual(
                hargl(q2)
                ,  ["i1a1", "i2a1", "i2a2"]
            );
            assert.deepStrictEqual(
                hargs(q2, {i1a2: "IwontAppear", i2a2: "second"})
                ,  [null, null, "second"]
                , "Argument list should be generated in right order"
            );

        });//}}}

    });

});


