SQLTT - SQL Tagged Templates
============================

> SQL Tagged Templates Engine

Index
-----

<!-- vim-markdown-toc GitLab -->

* [Abstract](#abstract)
* [Features](#features)
* [Usage Example](#usage-example)
    * [From NodeJS application:](#from-nodejs-application)
    * [From console](#from-console)
* [Template Examples](#template-examples)
    * [Simple template file](#simple-template-file)
    * [Simpler template example with no boilerplate](#simpler-template-example-with-no-boilerplate)
    * [Full example with nested templates](#full-example-with-nested-templates)
* [Supported Database Engines](#supported-database-engines)
    * [Adding more Database Engines](#adding-more-database-engines)
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
      elements array: une for the nested query and the other for a JSON
      argument linterals sepcification).

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


Usage Example
-------------

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

```sql
const sqltt = require("sqltt");
const q = new sqltt($ => ({
    // args: ["company_name", "company_dept"], // Specify parameters order
                                               // (optional)
    sql: $`
        --@@sql@@
        select *
        from users
        where company_name = ${"company_name"}
        and company_dept = ${"company_dept"}
        --@@/sql@@
    `,
}));

// Exports query to be used as library:
module.exports = q;

// When directly invoked, output propper cli version to stdout:
module.parent || console.log(q.sql('cli'));
```


### Simpler template example with no boilerplate

```sql
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

```sql
const sqltt = require("sqltt");
const q = new sqltt($ => ({
    sql: $`
        --@@sql@@
        with usersCte as (
            ${
                // Include another query:
                require("./users.sql.js")
            }
        )
        select *
        from usersCte
        join (
            ${
                // Include another query and fill some arguments:
                [require("./privileges.sql.js"), {privilege_name: "'login'"}]
            }
        ) as loggeableUsers
        --@@/sql@@
    `,
}));
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


TODO
----

  * Implement argument *hooks*.
    - I.e: {cli: {data: {jsonb_pretty(%) as %}}}

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

