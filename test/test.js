const assert = require('assert');
const sqltt = require('../');


// Helpers
// =======

function hsql(src, engine) {
    const q = new sqltt(src);
    return q.sql(engine);
};
function hargl(src) {
    const q = new sqltt(src);
    return q.argList;
};
function hargs(src, args) {
    const q = new sqltt(src);
    return q.args(args);
};


describe('sqltt class', function() {

    describe("Basic testing", function() {
        it ('Should have .getSource()', function() {
            var q;

            assert.doesNotThrow(function(){
                q = new sqltt("foobar");
            }, "Does not accept simple string as template");
            assert.equal(typeof q.getSource, "function");
        });
    });

    describe("Query Features", function() {

        it ('Acceptable template formats', function() {
            var q;

            assert.doesNotThrow(function() {
                q = new sqltt (
                    $=>$`
                        select ${$.arg("foo")}, ${"bar"}, ${"baz"}
                    `
                );
            });


            assert.equal("select $1, $2, $3", q.sql().trim());
            assert.equal("select :1, :2, :3", q.sql("oracle").trim());
            ///assert.equal("select :1, :2, :3", q.args({}));

        });

        it ('Interpolation methods', function() {

            const q = $=>$`s ${"foo"}, ${$.arg("bar")}, ${$.arg(["baz1", "baz2"])}, ${["baz3", "baz4"]} f`;
            assert.equal(
                hsql(q)
                , "s $1, $2, $3, $4, $5, $6 f"
            )
            assert.equal(
                hsql(q, "postgresql")
                , "s $1, $2, $3, $4, $5, $6 f"
            )
            assert.equal(
                hsql(q, "oracle")
                , "s :1, :2, :3, :4, :5, :6 f"
            )
            assert.deepStrictEqual(
                hargl(q)
                ,  ["foo", "bar", "baz1", "baz2", "baz3", "baz4"]
            )
            assert.deepStrictEqual(
                hargs(q, {foo: "fooArg", baz1: "baz1Arg"})
                ,  ["fooArg", null, "baz1Arg", null, null, null]
                , "Argument list should be generated in right order"
            )


        });


        it ('Arguments order', function() {

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

        });



    });






});


