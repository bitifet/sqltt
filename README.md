SQLTT - SQL Tagged Templates
============================

> SQL Tagged Templates Engine

Index
-----

<!-- vim-markdown-toc GitLab -->

* [Abstract](#abstract)
* [Features](#features)
* [Setup and Usage](#setup-and-usage)
    * [Usage:](#usage)
        * [*template* parts:](#template-parts)
        * [Valid *options*:](#valid-options)
* [Usage Examples](#usage-examples)
    * [From NodeJS application:](#from-nodejs-application)
    * [From console](#from-console)
* [Template Examples](#template-examples)
    * [Simple template file](#simple-template-file)
    * [Simpler template example with no boilerplate](#simpler-template-example-with-no-boilerplate)
    * [Full example with nested templates](#full-example-with-nested-templates)
* [Supported Database Engines](#supported-database-engines)
    * [Adding more Database Engines](#adding-more-database-engines)
* [Advanced Features](#advanced-features)
    * [Hooks](#hooks)
    * [SQL Alternatives](#sql-alternatives)
    * [String Concatenation](#string-concatenation)
    * [Query Splitting](#query-splitting)
* [TODO](#todo)
* [Contributing](#contributing)

<!-- vim-markdown-toc -->


Abstract
--------

*SQL Tagged Templates* (sqltt) allows to easily manage SQL queries from
Javascript Projects taking advantadge of the [ES6+ Tagged
Templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates)
feature.

Original idea comes from [this StackOverflow
answer](https://stackoverflow.com/a/41136912/4243912) which I have been using
and progressively evolving until it had become too big to agglutinate all
possible features I have been adding over time.


Features
--------

  * Very simple and readable templates.

  * Readable strings as placeholders instead of `$1`, `$2`, etc...
    - They are automatically replaced when rendering the query.

  * Nestable queries:
    - If placeholder is another *sqltt* template or instance, it is
      automatically nested in place (assuming/merging its arguments too).
    - Can be nested with some (or all) parameters previously fixed (using two
      elements array: one for the nested query and the other for a JSON
      argument linterals sepcification).
    - TODO: Deep nesting not yet working (only one level).

  * Multiple database engine support. Placeholderers and other tweaks get
    automatically generated in proper syntax.

  * Can generate both: queries to be used programatically and specific database
    cli text to easily test queries from console (see examples).

  * Easy arguments hanling:
    - Order can be explicitly (and even partially) specified in the `args`
      template property.
    - Non specified arguments are automatically fulfilled in query appearing
      order.
    - Arguments generation method provided.
      + Receives json object with key:value pairs.
      + Returns an array in the proper order.
      + Not needed properties are silently ignored.

  * SQL Syntax Hilighting in your preferred editor:
    - By using .sql extension instead of .js (despite the little js overhead).
    - By `-- @@/sql@@`and `-- @@/sql@@` comments [in
      Vim](http://vim.wikia.com/wiki/Different_syntax_highlighting_within_regions_of_a_file). 

  * Query Caché:
    - SQL for every database are generated and cached the first time they're
      required and then always consumed from caché.


Setup and Usage
---------------

To install *sqltt* symply execute `npm install --save sqltt` within your
project directory.

### Usage:

*sqltt* is intended to be required from SQL template files. (See [Template
Examples](#template-examples) below). 

Template structure will usually be as follows:

```javascript
const sqltt = require("sqltt");             // Require sqltt
const q = new sqltt(template, options);     // Define a query template.
module.exports = q;                         // Exports it.
module.parent || console.log(q.sql('cli')); // Allow cli usage.
```

Where:

  * `template`: Defines the template and possibly other parameters.
  * `options`: Optional *options* object to specify a few behavioral modifiers.


#### *template* parts:

  * `sql`: **(Mandatory)** Actual SQL template of the form `$=>$\`(sql
    here)\``. See [examples](#template-examples) below.  
  * `args`: **(Optional)** Array of strings declaring argument names (and its
    order).
  * `altsql`: **(Optional)** Let to provide alternative queries for given
    engines when compatibility hooks aren't enough.
  * alias: **(Optional)** Provide an alias name to be used in case of de whole
    query being included beside others through `$.include([subq1, ...])`.


#### Valid *options*:

  * **check_arguments** (default: *true*): Allows to avoid template's *args*
    validation checks (they will be auto-corrected instead of throwing an
    error).


Usage Examples
--------------

>
**NOTE:** All examples are for *PostgreSQL* engines. Either case, if engine is
not specified, a "generic" one gets used (which nowadays is exactly the same as
Postgres one).
>

### From NodeJS application:

```javascript
const myQuery = require('path/to/myQuery.sql.js');
const db = require('ppooled-pg')(connection_data); // Or your preferred library.
const inputData = {
    arg1: "value1",
    arg2: "value2",
    /* ... */
}
db.queryRows(
    myQuery.sql("postgresql")
    , myQuery.args(inputData)
        // (Unused arguments will be automatically ignored)
).then(rows=>console.log(rows);
```

> **NOTE:** From version 0.3.0, [ppooled-pg supports for *SQL Tagged
> Templates*](https://www.npmjs.com/package/ppooled-pg#support-for-sql-tagged-templates)
> so we could simply have wrote:
> ```sql
> db.queryRows(myQuery, inputData);
> ```


### From console

**For inspection:**
```sh
node path/to/myQuery.sql.js --postgres
```

**For execution:**

```sh
node path/to/myQuery.sql.js --postgres arg1, arg2 | psql dbName [other_arguments...]
```

Template Examples
-----------------


### Simple template file

```javascript
const sqltt = require("sqltt");
const q = new sqltt({
    // args: ["company_name", "company_dept"], // Specify parameters order
                                               // (optional)
    sql: $=>$`
        --@@sql@@
        select *
        from users
        where company_name = ${"company_name"}
        and company_dept = ${"company_dept"}
        --@@/sql@@
    `,
});

// Exports query to be used as library:
module.exports = q;

// When directly invoked, output propper cli version to stdout:
module.parent || console.log(q.sql('cli'));
```


### Simpler template example with no boilerplate

```javascript
module.exports = $ => ({
    sql: $`
        --@@sql@@
        select *
        from privileges
        where user_id = ${"user_id"}
        and privilege_name = ${"privilege_name"}
        --@@/sql@@
    `,
});
```

>
**NOTE:** This version should be used to instantiate *sqltt* (e.g: `const
myQuery = new sqltt(require("path/to/myQuery.sql.js"))`) and connot be used
[from console](#from-console).
>
The only advantadge of this approach is that we can bundle many queries in
single file and only instantiate those we are actually going to use.
>


### Full example with nested templates

```javascript
const sqltt = require("sqltt");
const q = new sqltt({
    sql: $=>$`
        --@@sql@@
        with usersCte as (
            ${
                // Include another query:
                $.include(require("./users.sql.js"))
            }
        )
        select *
        from usersCte
        join (
            ${
                // Include another query and fill some arguments:
                $.include(require("./privileges.sql.js"), {privilege_name: "'login'"})
            }
        ) as loggeableUsers
        --@@/sql@@
    `,
});
module.exports = q;
module.parent || console.log(q.sql('cli'));
```

>
**NOTE:** It does not matter if nested templates are already instantiated (like
[first example](#simple-template-file)) or not like ([second
one](#simpler-template-example-with-no-boilerplate)).  
>


Supported Database Engines
--------------------------

Currently supported engines are:

  * *postgresql:* For PostgreSQL Database.
  * *postgresqlcli:* For PostgreSQL CLI output.
  * *oracle:* For Oracle Database.

...and oracle still lacks cli implementation (so fails back to default one).

### Adding more Database Engines

If you are interested in adding more engines or improving existing ones, check
`lib/engines.js` file (They're too easy to implement) and please, feel free to
send me patches to include your improvements.


Advanced Features
-----------------

### Hooks

Hooks lets us to wrap arguments differently according to the actual engine.

They consist on a function that takes the original string and the engine name.
If this function returns a non falsy value, the argument is replaced by that in
the query. Otherwise it remains untouched.

>
**NOTE:** Hooks can also be applied to non argument keywords. To do so we need
to escape them as if it were real arguments and then wrap it as an array. This
will avoid its interpolation as argument.
>

**Example:**

```javascript
const sqltt = require("sqltt");
const q = new sqltt({
    hooks: {
        // Prettier formatting on cli output:
        json_data: (arg, eng) => eng.match(/(^|_)cli$/) && "jsonb_pretty("+arg+") as "+arg,
        // Fix lack of implicit casting in Oracle:
        fromTimestamp: (arg, eng) => eng.match(/^oracle/) && "TO_DATE("+arg+", 'yyyy/mm/dd')",
    },
    sql: $=>$`
        --@@sql@@
        select ${["json_data"]}
        from some_table
        where some_column = ${"some_value"}
        --@@/sql@@
    `,
});
module.exports = q;
module.parent || console.log(q.sql('cli'));
```

There's a shorthand consisting in to simply specify an alternative string. In
this case the replacement would be done inconditionally. But this could be
helpful in case we want to manually enable/disable some tweaks without editing
the actual SQL (just commenting in and out that hook).

**Example:**

```javascript
        // If we wanted to apply this hook to all engines:
        json_data: (arg, eng) => eng.match(/(^|_)cli$/) && "jsonb_pretty("+arg+") as "+arg,
        // We could have written it as:
        json_data: "jsonb_pretty(%) as %",

```


### SQL Alternatives

If it is impossible or unreasonable to use the same sql structure for some
database engines, *sqltt* allows to specify a completely different sql source
for given database through *altsql* property.

**Example:**

```javascript
const sqltt = require("sqltt");
const q = new sqltt({
    sql: $=>$`
        --@@sql@@
        /* Regular SQL */
        --@@/sql@@
    `,
    altsql: {
        $=>$`
            --@@sql@@
            /* Oracle specific SQL */
            --@@/sql@@
        `
    }
});
module.exports = q;
module.parent || console.log(q.sql('cli'));
```

>
**NOTE:** Argument names and order are checked to be the same in all query
alternatives to ensure its consistency so using *args* property to fix their
order is hardly encouraged.
>


### String Concatenation

*sqltt* template instances provide a `.concat(<string>)` method returning a new
instance whose `sql(<whatever>)` method will return provided string
concatenated at the end.

This is useful to add simple clauses such as `limit`, `order by` or `group by`
from our application logic.

**Example:**

```javascript
const myQuery = require('path/to/myQuery.sql.js')
    .concat("limit 100")
;
db.queryRows(
    myQuery.sql("postgresql")
    , myQuery.args(inputData) // or simply "inputData" if db is sqltt aware*
        // (*) Such as ppooled-pg
).then(rows=>console.log(rows);
```

### Query Splitting

Another *sqltt* instance's method is `.split(<engineType>)`.

This method picks the SQL for the specified engine (or default one if not
specified or there isn't *altsql* specification for it) and splits it by all
contained semicolons (`;`).

It retruns an array of new *sqltt* instances for those subqueries.



TODO
----

  * Implement per-engine SQL alternatives

  * Improve this README file.

  * Implement customisation opitons:
    - Smart indentation.
    - Comments Removal.

  * Incorporate Oracle comptibility Shims


Contributing
------------

If you are interested in contributing with this project, you can do it in many ways:

  * Creating and/or mantainig documentation.

  * Implementing new features or improving code implementation.

  * Reporting bugs and/or fixing it.

  * Sending me any other feedback.

  * Whatever you like...

Please, contact-me, open issues or send pull-requests thought [this project GIT repository](https://github.com/bitifet/sqltt)

