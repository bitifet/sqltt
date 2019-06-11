![SQLTT - SQL Tagged Templates](sqltt_logo.png "SQLTT - SQL Tagged Templates")
==============================================================================

*SQL Tagged Templates* (sqltt) allows to easily manage SQL queries from
Javascript Projects taking advantadge of the [ES6+ Tagged
Templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates)
feature.


| 💡 [Examples](#examples)                               | 📖 [Usage Manual](#usage-manual)    | 💼 **More...**                |
|--------------------------------------------------------|-------------------------------------|-------------------------------|
| [Template Syntax](#template-example)                   | [Features](#features)               | [ABOUT](#about-sqltt)         |
| [Usage as CLI Tool](#executing-from-cli)               | [Template Format](#template-format) | [TODO](#todo)                 |
| [Usage as Node Module](#using-from-nodejs-application) | [API Reference](#api-reference)     | [Contributing](#contributing) |


Examples
--------

Following are a few examples to better understand what *SQLTT* does and how
powerful it is just in a glance.


### Template example

<!-- {{{ -->

The following example shows how a *SQLTT* template looks like and how we can
use that template to generate actual SQL suitable for multiple database engines
or even directly execute it through a *CLI* interpreter.


**$ ``cat personnel.sql.js``**

```javascript
const sqltt = require("sqltt");
const commonFields = ["dptId", "name", "sex", "birth"];


const tpl = {};

tpl.list = new sqltt(`
    select id, dptName, name
    from personnel
    join depts using(dptId)
`);

tpl.listByDept = new sqltt($=>$`
    ${tpl.list}                 ${$.REM("Same as ${$.include(tpl.list)}")}
    where dptId = ${"dptId"}  ${$.REM("Same as ${$.arg('dptId')}")}
`);

tpl.show = new sqltt($=>$`
    select id, dptName, name, birth, ctime
    from personnel
    join depts using(dptId)
    where id = ${"id"}
`);

tpl.insert = new sqltt($=>$`
    insert into personnel (${$.keys(commonFields)})
    values (${$.values(commonFields)})
`);

tpl.update = new sqltt($=>$`
    update personnel set ${$.entries(commonFields)}
    where id = ${"id"}
`);

sqltt.publish(module, tpl); // Export and make available from CLI
```

<!-- }}} -->

### Executing from cli

<!-- {{{ -->

This specific template example provide multiple queries in single file so, when
invoked from command line without arguments, it will ask us for a query
selection:

**$ ``node personnel.sql.js``**

```sh
Available queries: list, listByDept, show, insert, update
```

> 📌 If single SQLTT template where published in that file, we would had
> obtained its SQL instead just like we are going to obtain right now by
> specifying it.

Now we can obtain desired query just specifying it as a parameter:

**$ ``node personnel.sql.js list``**

```sql
    select id, dptId, dptName, name, sex
    from personnel
    join depts using(dptId)
```


...and, of course, we can pipe it to our preferred database engine too:

**$ ``node personnel.sql.js list | psql tiaDB``**

```sh
 id |   dptid    |    dptname     |   name    | sex
----+------------+----------------+-----------+-----
  1 | management | Management     | Super     | m
  3 | oper       | Operations     | Filemon   | m
  2 | oper       | Operations     | Mortadelo | m
  4 | adm        | Administration | Ofelia    | f
  5 | i+d        | I+D            | Bacterio  | m
(5 rows)
```

Other queries may require arguments, so we just provide them as additional
command line arguments:

**$ ``node personnel.sql.js listByDept oper``**

```sql
\set dptId '''oper'''
        select id, dptId, dptName, name, sex
    from personnel
    join depts using(dptId)
    where dptId = :dptId
```

...and, again, we can execute obtained sql too:

**$ ``node personnel.sql.js listByDept oper | psql tiaDB``**

```sh
 id | dptid |  dptname   |   name    | sex
----+-------+------------+-----------+-----
  2 | oper  | Operations | Mortadelo | m
  3 | oper  | Operations | Filemon   | m
(2 rows)
```

<!-- }}} -->


### Using from NodeJS application:

<!-- {{{ -->

Since we export our templates as SQLTT instances we just need to require and
start using them.

> 📌 In [previous example](#template-example) we *published* our templates
> through ``sqltt.publish(module, tpl);`` statement which, from our point of
> view now, is the exact same as exporting them through ``module.exports =
> tpl;`` except for the fact that this way it wouldn't have been [usable from
> CLI](#executing-from-cli) too like it had.

Either if we exported/published single *SQLTT Template* or multiple ones, now
we are able to use them through multiple methods which we call them our
*[Template API](#template-api)*.


**Example:**

```javascript
const personnelSQL = require('path/to/personnel.sql.js');

// Show rendered SQL of each query:
console.log (personnelSQL.list.sql());
console.log (personnelSQL.listByDept.sql());
console.log (personnelSQL.show.sql());
console.log (personnelSQL.insert.sql());
console.log (personnelSQL.update.sql());
```


> 📌 ``.sql()`` method also accepts an optional parameter to specify desired
> [engine flavour](#engine-flavours). If not specified, default one is used.


Another commonly used *[Template API](#template-api)* method is ``.args()``
which let us to convert a *{key: value}* pairs object to a properly sorted
arguments array to feed our database query method.


**Example using [ppooled-pg](https://www.npmjs.com/package/ppooled-pg):**

```javascript
// Insert new item
const personnelSQL = require('path/to/personnel.sql.js');
const db = require('ppooled-pg')(/*connection data*/);
const newPerson = {
    name: "Chorizez",
    dptId: "robbers",
    sex: "m",
    // birth: "", // Unknown data will default to null
    connection: { // Unused data will be ignored
        ip: "10.0.1.25",
        port: 80,
        trusted: false,
    }
};
db.queryRows(
    personnelSQL.insert.sql("postgresql")
    , personnelSQL.insert.args(newPerson)
).then(rows=>console.log(rows);
```

> 📌 From version 0.3.0, [ppooled-pg natively supports for *SQL Tagged
> Templates*](https://www.npmjs.com/package/ppooled-pg#support-for-sql-tagged-templates)
> so we could simply have wrote: ``db.queryRows(personnelSQL.insert,
> newPerson)``.


See *[Template API](#template-api)* secton for more details of available
methods and their options.

<!-- }}} -->



USAGE MANUAL
============

Table of Contents
-----------------

<!-- vim-markdown-toc GitLab -->

* [ABOUT SQLTT](#about-sqltt)
* [FEATURES](#features)
* [BASIC CONCEPTS](#basic-concepts)
    * [Engine flavours](#engine-flavours)
* [SETUP AND USAGE](#setup-and-usage)
    * [Package setup](#package-setup)
    * [Writing templates](#writing-templates)
    * [Usage](#usage)
        * [From application](#from-application)
        * [From CLI](#from-cli)
            * [Providing arguments](#providing-arguments)
            * [Executing queries](#executing-queries)
            * [Selecting Engine Flavour](#selecting-engine-flavour)
            * [Query output inspection](#query-output-inspection)
* [TEMPLATE FORMAT](#template-format)
    * [SQL Callback](#sql-callback)
* [API REFERENCE](#api-reference)
    * [Template API](#template-api)
        * [sql(engFlavour)](#sqlengflavour)
        * [args(argData)](#argsargdata)
        * [concat(str)](#concatstr)
        * [split(engFlavour)](#splitengflavour)
        * [options(optsObject)](#optionsoptsobject)
    * [Tag API](#tag-api)
        * [arg(argName)](#argargname)
        * [literal(str)](#literalstr)
        * [include(src [, bindings])](#includesrc-bindings)
    * [keys(), values() and entries()](#keys-values-and-entries)
* [OUTDATED:](#outdated)
    * [Single-query template files:](#single-query-template-files)
    * [Mulitple-query template files:](#mulitple-query-template-files)
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
* [TODO](#todo)
* [Contributing](#contributing)

<!-- vim-markdown-toc -->

ABOUT SQLTT
-----------


<!-- {{{ -->

SQL is a powerful language, but most databases come with their own variations
and nuances.

Even for the same database engine, the syntax used in application libraries and
[CLI](https://en.wikipedia.org/wiki/Command-line_interface#Other_command-line_interfaces)
interpreters usually differs. At least for parametyzed queries.

This often forces developers to modify their queries back and forth to test
them in database CLI or, even worst, when they need to support different
database engines. In which case they are most times forced to mantain
completely different versions of the same query for each supported database.

ORM solutions solve that problem at the cost of generating suboptimal queries
and disallowing most powerful SQL and/or database-specific features.

SQLTT allow us to maintain single version of each query while preserving the
whole power of actual SQL also providing many advanced features such as reusing
snipppets or whole queries and [much more](#features) fully embracing the
[DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself) principle.

> 💡 **Original Idea:** Original idea comes from [this StackOverflow
> answer](https://stackoverflow.com/a/41136912/4243912) which I have been using
> and progressively evolving until it had become too big to agglutinate all
> possible features I have been adding over time.


<!-- }}} -->


FEATURES
--------

<!-- {{{ -->
  * DRY: 
    - Write single SQL template.
    - Render it for [for your application](#from-application) properly
      formatted for one or more database engines. Ex.:
      - PostgreSQL: ``myTpl.sql('postgresql') // select [...] where baz = $1``
      - Oracle: ``myTpl.sql('oracle')'        // select [...] where baz = :1``
      - ...
    - Generate [database-specific CLI versions](#executing-queries) too.
      - PostgreSQL: ``myTpl.sql('postgresql_cli') // select [...] where baz = :baz``
      - Auto: ``myTpl.sql('cli') // Use 'default_cli' unless SQLTT_ENGINE env var defined``
    - ...all without changing anything.

  * Very simple, readable and non-intrusive [template
    format](#template-format).

  * Easy placeholders hanling:
    - Readable strings as argument placeholders instead of ``$1``, ``$2``,
      etc... (postgresql) or ``:1``, ``:2``, etc... (oracle), for example.
    - Numeration can be (even partially) explicitly specified by enumerating
      them in the ``args`` template property or infered by its apparition order
      Non specified arguments are automatically fulfilled in query appearing
      order.

  * Arguments generator helper:
    - Generates properly sorted arguments array from a *{key: value,...}* object.
    - Missing keys defaults to *null* and unused ones are silently ignored.
    - Ex.: ``myTpl.args({foo: "fooVal", bar: "barVal"})``.

  * Publishing helper: ``sqltt.publish(module, myTpl);``
    - Assigns ``myTpl`` to ``module.exports`` (so exports it).
    - If template file is directly invoked, outputs *CLI* SQL to stdout.
      - ``node myTpl.sql.js`` outputs general cli output.
      - ``SQLTT_ENGINE=postgresql node myTpl.sql.js`` outputs postgresql
        flavoured CLI output.
    - If myTpl is a *key: value* object instead, first argument is expected to
      select which query is required.
      - Ex.: ``node myTplLib.sql.js listQuery``
      - If no argument provided in this case, a list of available keys will be
        shown instead.
    - Arguments are wrapped in a *set* commands.
      - Ex.: ``node myTpl.sql parameter1 parameter2 "third parameter"``
      - Ex.: ``node myTplLib.sql listBySection sectionId``

  * Direct execution: standard output can obviously redirected to any database
    sql interpreter.
    - Ex.: ``node myTplLib someQuery value1 "second value" | psql myDb``

  * Query nesting: If, instead of a regular string, another *sqltt* instance is
    interpolated, it will be correctly rendered in place and even its argument
    declarations will be conveniently assumed in the right order and without
    duplications.
    - Ex.: ``$=>$`${listQuery} and typeid = ${"tid"}` ``.

  * Advanced Interpolation Api: When ``$=>$`...` `` form is used, the tag
    function ("$" argument) comes with a bunch of methods providing more advanced
    functionalities.
    - In fact, ``${"someArg"}`` is, in fact, a shorthand for ``${$.arg("someArg"})}``.
    - ...and ``${someSubtemplate}`` is the same as ``${$.include(someSubtemplate)}``.
    - But they can take more arguments. Ex.: ``${$.include(someSubtemplate,
      {arg1: "fixedValue"})}``
    - And there are a few more:
      - ``$.literal()``
      - ``$.keys()`` and ``$.values()``.
        - Ex.: ``insert into foo (${$.keys(someObj)}) values (${$.values(someObj)})``
      - ``$.entries()``.
        - Ex.: ``update foo set ${$.entries(someObj)} where ...``
      - And more comming (``$.if(cnd, thenCase, elseCase)``, ...).

  * Query Caché:
    - SQL for every database are generated and cached the first time they're
      required and then always consumed from caché.

  * SQL Syntax Hilighting in your preferred editor:
    - By using .sql extension instead of .js (despite the little js overhead).
    - By ``-- @@/sql@@``and ``-- @@/sql@@`` comments [in
      Vim](http://vim.wikia.com/wiki/Different_syntax_highlighting_within_regions_of_a_file). 
<!-- }}} -->


BASIC CONCEPTS
--------------

### Engine flavours

FIXME: Write out this subject...


SETUP AND USAGE
---------------

### Package setup

Install *sqltt* executing ``npm install --save sqltt`` within your
project directory.


### Writing templates
<!-- {{{ -->
Every template file may contain single or multiple *SQLTT* templates and may
export them either in its source form as already constructed *SQLTT* instances.

But preferred way is as follows:


**For single template:**

```javascript
const sqltt = require("sqltt");
const tpl = new sqltt(
    /* Template source in any valid format */
);
sqltt.publish(module, tpl);
```

**For multiple templates:**

```javascript
const sqltt = require("sqltt");
const tpl = {
    aQuery: new sqltt( /* Template source... */),
    anotherQuery: new sqltt( /* Template source... */),
    /* ... */
};
sqltt.publish(module, tpl);
```

See [Template Format](#template-format) below to learn about the syntax of
template sources.
<!-- }}} -->

### Usage
<!-- {{{ -->
The final ``sqltt.publish(module, tpl)`` statement in [previous
examples](#writing-templates) replaces classic ``module.exports = tpl`` and is
almost equivalent to:

```javascript
module.exports = tpl;                      // Exports template.
module.parent || console.log(              // Allow CLI usage.
    tpl.sql('cli', process.argv.slice(2))  // Passing shell arguments.
);
```

> 👉 In fact it's slightly more complicated in order to properly handle
> multiple-template files too as well as other slight nuances.

This allows us to use our constructed sqltt instances:

1. [From application](#from-application): As a module from NodeJS application.
2. [From CLI](#from-cli): As a command line tool to get
   *whatever_our_database_cli suitable* rendered SQL.
<!-- }}} -->

#### From application
<!-- {{{ -->
**Single Template Example:**

```javascript
const myQuery = require('path/to/myTemplate.sql.js');
const sql = myQuery.sql('postgresql');
const args = myQuery.args({
    arg1: "val1",
    arg2: "val2",
    /* ... */
});

// myDb.query(sql, args);
```

> 📌 The ``'postgresql'`` argument in ``myQuery.sql('postgresql')`` statement
> tells *SQLTT* to render *PostgreSQL* flavoured SQL syntax.
>
> Nowadays ``'postgresql'`` and ``'default'`` engine flavours works just the
> same. But other databases may have some nuances such as Oracle's way to specify
> arguments as ``:1``, ``:2``... instead of ``$1``, ``$2``...
>
> Additionally, templates can specify a ``default_engine`` property to override
> the default one.


**Multiple Template Example:**

```javascript
const myQueries = require('path/to/myTemplate.sql.js');
const userList_sql = myQueries.userList.sql('postgresql');
const userProfile_sql = myQueies.userProfile.sql('postgresql');

const userProfile_args = myQueries.userProfile.args({
    userId: "someId",
    /* ... */
});

// myDb.query(userList_sql, []);
// myDb.query(userProfile_sql, userProfile_args);

```
<!-- }}} -->

#### From CLI
<!-- {{{ -->
From command line we just need to execute our template through *node*:

```sh
node path/to/myTemplate.sql.js
```

If it is a single template file it will directly render its SQL.

Otherwise, and if no arguments provided, it will output a list of available
queries.

**Example:**

```sh
user@host:~/examples$ node personnel.sql.js
Available queries: list, listByDept, show, insert, update
```

...then we just need to pick for the desired query to render:

```sh
user@host:~/examples$ node personnel.sql.js list

select * from personnel;

```
<!-- }}} -->

##### Providing arguments
<!-- {{{ -->
If our query requires arguments, we can feed it by simply adding them to the
command line:

**Example:**

```sh
user@host:~/examples$ node personnel.sql.js show 23

\set user_id '''23'''
    select *
    from personnel
    where id = :id

```

> 📌 From command line, when an argument is numeric, we can't tell whether it
> is intended to be an actual number type or string.
>
> For this reason all arguments are quoted unconditionally given that most
> database engines will automatically cast them as numbers when needed.
<!-- }}} -->


##### Executing queries
<!-- {{{ -->
If we want to directly execute the query instead, we just need to pipe it to
our preferred database CLI interpreter.

**Example:**

```sh
user@host:~/examples$ node personnel.sql.js list | psql tiaDB

 id |   name    | sex | dptName        |   birth    |           ctime
----+-----------+-----+----------------+------------+----------------------------
  1 | Mortadelo | m   | Operations     | 1969-03-10 | 2019-05-31 10:58:09.346467
  2 | Filemon   | m   | Operations     | 1965-08-15 | 2019-05-31 10:58:46.291629
  3 | Ofelia    | f   | Administration | 1972-08-29 | 2019-05-31 11:05:16.594719
  4 | Bacterio  | m   | I+D            | 1965-08-15 | 2019-05-31 11:05:35.807663
(...)
```
<!-- }}} -->

##### Selecting Engine Flavour
<!-- {{{ -->
To render SQL from CLI, *default_cli* engine is selected by default except if
``default_engine`` property is defined in template source. For example, for
``temlate_engine: "postgresql"``, *postgresqsl_cli* will be picked for instead.

On the other hand, in case we want to specifically pick for given database
engine flavour when we are going to generate SQL from *CLI*, we can set the
*SQLTT_ENGINE* environment variable in our shell either by:

  a) Exporting it (Ex.: ``export SQLTT_ENGINE=postgresql``).

  b) Setting just for single execution (Ex.: ``SQLTT_ENGINE=oracle node
      myTpl.sql.js ...``).
<!-- }}} -->


##### Query output inspection


(nocli, *_nocli)



TEMPLATE FORMAT
---------------

<!-- {{{ -->
SQLTT templates consist in a JSON object with one or more of the following keys:

  * **sql:** *(Mandatory)* a SQL string or a [SQL Callback](#sql-callback).
    Using  a simple string provides a leaner way to define SQL string. But no
    interpolated arguments are possible in this case.

  * **args:** *(Optional)* An array of strings declaring argument names and the
    order in which they must be numbered. If ommitted or incomplete, the rest
    of arguments will be appended in appearing order.

  * **altsql:** *(Optional)* One of the main goals of **SQLTT** is not having
    to mantain multiple versions of the same query for different databases. But
    when there is no other option, *altsql* let us to provide alternatives for
    specific database engines. Ex.: `` altsql: { oracle: /* Oracle-specific sql
    string or cbk */} ``.

  * **default_engine:** *(Optional)* Change the default rendering engine for
    that template. That is: the engine that will be used to render SQL when it
    is not explicitly specified in ``.sql()`` method call.



**Examples:**

  * Arguments in given order: ``{args: ["baz"], sql: $=>$`select foo from bar where baz = ${"baz"}`} ``.
  * Arguments in appearence order: ``$=>$`select foo from bar where baz = ${"baz"}` ``.
  * Simple string: ``"select foo from bar"`` (no argumments in this case)
<!-- }}} -->

### SQL Callback
<!-- {{{ -->
The *SQL Callback* receives single parameter (named `$`, even we can name it
whatever we like).

This parameter is expected to receive a *tag function* and the whole callback
is expected to return an [ES6+ Tagged Template
Literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates)
generating an SQL statement.

**Example:**

```javascript
$=>$`
    select foo
    from bar
    where baz = ${"value"}
```

**NOTES:**

  * *Arrow function* syntax is used too in order to minimize verbosity.

  * In ``${"value"}``, the ``$`` sign is part of *ES6+ Tagged Templates*
    interpolation syntax (``${...}``). Not the tag function.
    - That is: ``X=>X`select ... = ${"value"}`` could had been used instead.

  * The ``$`` argument, despite being the *tag function*, it has also various
    methods (which we call the [Tag API](#tag-api)) providing several extra
    functionalities.

  * In fact, ``${"value"}`` is just a shorthand for ``${$.arg("value")}`` (or
    ``${X.arg("value")}`` if ``X`` is used instead of ``$``).
<!-- }}} -->



API REFERENCE
-------------
<!-- {{{ -->
*SQLTT* involves two API interfaces:

  * [Template API](#template-api): That is the methods we have available from
    any *SQLTT* instantiated template.

  * [Tag API](#tag-api): Consisting on various methods attached to the tag
    function our template will receive during its compilation.
<!-- }}} -->

### Template API

After instantiating our template as SQLTT (`const myQuery = new
sqltt(_my_template_)`), we are allowed to use below methods:

#### sql(engFlavour)




**Arguments:**

  * *engName:* (Optional)


#### args(argData)


**Arguments:**

  * *argData:* Can be a simple array



#### concat(str)


#### split(engFlavour)


#### options(optsObject)


Another *sqltt* instance's method is `.split(<engineType>)`.

This method picks the SQL for the specified engine (or default one if not
specified or there isn't *altsql* specification for it) and splits it by all
contained semicolons (`;`).

It retruns an array of new *sqltt* instances for those subqueries.


### Tag API


#### arg(argName)

#### literal(str)

#### include(src [, bindings])

### keys(), values() and entries()




OUTDATED:
---------

(from version 0.3.1 and earlier)


### Single-query template files:

*sqltt* is intended to be required from SQL template files. (See [Template
Examples](#template-examples) below). 

Template structure will usually be as follows:

```javascript
const sqltt = require("sqltt");             // Require sqltt
const q = new sqltt(template, options);     // Define a query template.
module.exports = q;                         // Exports it.
module.parent || console.log(               // Allow CLI usage.
    q.sql('cli', process.argv.slice(2))     // Allow shell arguments
);
```

**Where:**

  * ``template``: Defines the template and possibly other parameters (see
          [template parts:](#template-parts) below).
  * ``options``: Optional *options* object to specify a few behavioral modifiers.

**Usage Examples:**

  * From application:

```javascript
const myQuery = require('path/to/my/sqltt_template.sql.js');
const sql = myQuery.sql('postgresql'); // Get postgresql suitable SQL.
const sql = myQuery.sql('oracle');     // Get postgresql suitable SQL.
const args = myQuery.args({            // Get properly sorted and filtered
    argument1: "value1",               // arguments array.
    argument2: "value2",
    /*...*/
});
```

  * From command line:

```sh
# Get parametyzed sql to provide to some database CLI:
$ node myQuery.sql.js arg1 arg2 "argument 3"
# Do the same specifically for oracle engine:
$ SQLTT_ENGINE=oracle node myQuery.sql.js arg1 arg2 # (...)
# You also can directly pipe to that CLI:
$ SQLTT_ENGINE=postgresql node myQuery.sql.js arg1 arg2 | psql myDb
```

### Mulitple-query template files:

For small queries, sometimes it turns out being more practical gathering them
together into single file exported as *key*->*value* object.

We can achieve this with minimal changes to the previous pattern:

```javascript
const sqltt = require("sqltt");          // Require sqltt
const q = {                              // Define multiple named queries.
    list: new sqltt(listQueryTemplate, options),
    get:  new sqltt(getQueryTemplate, options),
    insert:  new sqltt(insertQueryTemplate, options),
    update:  new sqltt(updateQueryTemplate, options),
    /* ... */
}
module.exports = q;                      // Exports it.
if (! module.parent) {
    const args = process.argv.slice(2);  // Get shell arguments.
    const qId = args.shift()             // Extract first as query id.
    console.log (qId
        ?  q[qId].sql('cli', args)       // Render query if selected
        : "Available queries: " + Object.keys(q).join(", ")
    );  // ...and provide available queries list if no argument provided.
};
```

**Usage Examples:**

  * From application:

```javascript
const myQueryRepo = require('path/to/my/sqltt_tpl_repo.sql.js');
const sql = myQueryRepo.someQuery.sql('postgresql');
const args = myQueryRepo.someOtherQuery.args({ /*...*/ });
```

  * From command line:

```sh
# The only difference here is that we reserve the first argument to select
# targetted query.
$ node myQuery.sql.js someQuery arg1 arg2 "argument 3"
```


#### *template* parts:

  * ``sql``: **(Mandatory)** Actual SQL template of the following form (See
    [examples](#template-examples) below):
```
  $=>$`(sql here)` 
```
  * ``args``: **(Optional)** Array of strings declaring argument names (and its
    order).
  * ``altsql``: **(Optional)** Let to provide alternative queries for given
    engines when compatibility hooks aren't enough.
  * alias: **(Optional)** Provide an alias name to be used in case of de whole
    query being included beside others through ``$.include([subq1, ...])``.


#### Valid *options*:

  * **check_arguments** (default: *true*): Allows to avoid template's *args*
    validation checks (they will be auto-corrected instead of throwing an
    error).


### Usage Examples


> 📌 All examples are for *PostgreSQL* engines. Either case, if engine is not
> specified, a "generic" one gets used (which nowadays is exactly the same as
> Postgres one).

#### From NodeJS application:

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

> 📌 From version 0.3.0, [ppooled-pg supports for *SQL Tagged
> Templates*](https://www.npmjs.com/package/ppooled-pg#support-for-sql-tagged-templates)
> so we could simply have wrote:
> ```sql
> db.queryRows(myQuery, inputData);
> ```


#### From console

**For inspection:**
```sh
SQLTT_ENGINE=postgresql node path/to/myQuery.sql.js
```

**For execution:**

```sh
SQLTT_ENGINE=postgresql node path/to/myQuery.sql.js arg1, arg2 | psql dbName [other_arguments...]
```

**In multiple query format:**

```sh
SQLTT_ENGINE=postgresql node path/to/myQueryRepo.sql.js queryName
# ... arg1, arg2 | psql dbName [...] # To execute
```




### Template Examples


#### Simple template file

```javascript
const sqltt = require("sqltt");
const q = new sqltt({
    // args: ["company_name", "company_dept"], // Specify parameters order
                                               // (optional)
    sql: /* @@sql@@ */ $=>$`
        select *
        from personnel
        where company_name = ${"company_name"}
        and company_dept = ${"company_dept"}
    `, /* @@/sql@@ */
});

// Exports query to be used as library:
module.exports = q;

// When directly invoked, output propper cli version to stdout:
module.parent || console.log(q.sql('cli', process.argv.slice(2)));
```

> 📌 ``/* @@sql@@ */`` and ``/* @@/sql@@ */`` comments are optional (and, for
> the sake of simplicity, I won't use them again in this document.
>
> I only left them once because I'm sure that vim users [will enjoy
> them](http://vim.wikia.com/wiki/Different_syntax_highlighting_within_regions_of_a_file). 


#### Simpler template example with no boilerplate

```javascript
module.exports = $ => ({
    sql: $`
        select *
        from privileges
        where user_id = ${"user_id"}
        and privilege_name = ${"privilege_name"}
    `,
});
```

> 📌 This version should be used to instantiate *sqltt* (e.g: ``const myQuery =
> new sqltt(require("path/to/myQuery.sql.js"))``) and connot be used [from
> console](#from-console).
>
> The only advantadge of this approach is that we can bundle many queries in
> single file and only instantiate those we are actually going to use.


#### Full example with nested templates

```javascript
const sqltt = require("sqltt");
const q = new sqltt({
    sql: $=>$`
        with usersCte as (
            ${
                // Include another query:
                $.include(require("./personnel.sql.js"))
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
    `,
});
module.exports = q;
module.parent || console.log(q.sql('cli', process.argv.slice(2)));
```

> 📌 It does not matter if nested templates are already instantiated (like
> [first example](#simple-template-file)) or not like ([second
> one](#simpler-template-example-with-no-boilerplate)).


### Supported Database Engines

Currently supported engines are:

  * *postgresql:* For PostgreSQL Database.
  * *postgresqlcli:* For PostgreSQL CLI output.
  * *oracle:* For Oracle Database.

...and oracle still lacks CLI implementation (so fails back to default one).

#### Adding more Database Engines

If you are interested in adding more engines or improving existing ones, check
``lib/engines.js`` file (They're too easy to implement) and please, feel free to
send me patches to include your improvements.


### Advanced Features

#### Hooks

Hooks lets us to wrap arguments differently according to the actual engine.

They consist on a function that takes the original string and the engine name.
If this function returns a non falsy value, the argument is replaced by that in
the query. Otherwise it remains untouched.

> 📌 Hooks can also be applied to non argument keywords. To do so we need
> interpolate them using [literal() tag method](#literalstr).


to escape them as if it were real arguments and then wrap it as an array. This
will avoid its interpolation as argument.
>

**Example:**

```javascript
const sqltt = require("sqltt");
const q = new sqltt({
    hooks: {
        // Prettier formatting on CLI output:
        json_data: (arg, eng) => eng.match(/(^|_)cli$/) && "jsonb_pretty("+arg+") as "+arg,
        // Fix lack of implicit casting in Oracle:
        fromTimestamp: (arg, eng) => eng.match(/^oracle/) && "TO_DATE("+arg+", 'yyyy/mm/dd')",
    },
    sql: $=>$`
        select ${["json_data"]}
        from some_table
        where some_column = ${"some_value"}
    `,
});
module.exports = q;
module.parent || console.log(q.sql('cli', process.argv.slice(2)));
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


#### SQL Alternatives

If it is impossible or unreasonable to use the same sql structure for some
database engines, *sqltt* allows to specify a completely different sql source
for given database through *altsql* property.

**Example:**

```javascript
const sqltt = require("sqltt");
const q = new sqltt({
    sql: $=>$`
        /* Regular SQL */
    `,
    altsql: {
        $=>$`
            /* Oracle specific SQL */
        `
    }
});
module.exports = q;
module.parent || console.log(q.sql('cli', process.argv.slice(2)));
```

> 📌 Argument names and order are checked to be the same in all query
> alternatives to ensure its consistency so using *args* property to fix their
> order is hardly encouraged.


#### String Concatenation

*sqltt* template instances provide a ``.concat(<string>)`` method returning a new
instance whose ``sql(<whatever>)`` method will return provided string
concatenated at the end.

This is useful to add simple clauses such as ``limit``, ``order by`` or ``group by``
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



TODO
----

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

