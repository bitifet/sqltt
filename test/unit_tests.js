const assert = require('assert');

describe ('Unit Tests', function () {

    describe("lib/engines.js", function() {//{{{

        it ('patch_name()', function() {
            const {patch_name} = require("../lib/engines");

            [
                [["oracle", "mySql", "postgresql"], "postgresql"],
                [["cli", "nocli", "postgresql"], "postgresql_nocli"],
                [["", "nocli", "postgresql", "oracle_cli"], "oracle_cli"],
                [["", "nocli", "postgresql", "oracle_cli", "nocli"], "oracle_nocli"],
                [["", "nocli", "postgresql", "oracle_cli", "postgresql"], "postgresql_cli"],
            ].map(
                ([a, r]) => assert.deepStrictEqual (patch_name(...a), r)
            );
        });

    });//}}}

});
