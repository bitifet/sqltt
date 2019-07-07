
![SQLTT - SQL Tagged Templates](sqltt_logo.png "SQLTT - SQL Tagged Templates")


[![Known Vulnerabilities](https://snyk.io/test/npm/sqltt/badge.svg?style=flat-square)](https://snyk.io/test/npm/sqltt)

----------------------------------------------------


*SQL Tagged Templates* (sqltt) allows to easily manage SQL queries from
Javascript Projects taking advantadge of the [ES6+ Tagged
Templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates)
feature.


| 💡 [Examples](#examples)                               | 📖 [Usage Manual](#usage-manual)    | 💼 **More...**                          |
|--------------------------------------------------------|-------------------------------------|-----------------------------------------|
| [Template Syntax](#template-example)                   | [Features](#features)               | [ABOUT](#about-sqltt)                   |
| [Usage as CLI Tool](#executing-from-cli)               | [Template Format](#template-format) | [Advanced Features](#advanced-features) |
| [Usage as Node Module](#using-from-nodejs-application) | [API Reference](#api-reference)     | [TODO](#todo)                           |
| [Usage from non js languages](using-from-non-javascript-languages) | [Static Methods](#static-methods) | [Contributing](#contributing) |


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

> 📌 If single SQLTT template where published in that file, we would had got
> its SQL instead just like we are going to obtain right now by specifying it.

Now we can obtain desired query just by specifying it as a parameter:

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


### Using from NodeJS application

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
>
> But this example was intended to work with most database libraries with
> minimum changes.

See *[Template API](#template-api)* secton for more details of available
methods and their options.

<!-- }}} -->


### Using from non javascript languages

Athough they're javascript, we can take advantadge of *SQLTT* templates even
for other language programs.

Despite they won't be able directly use [Template API](#template-api) methods
such as [args()](#argsargdata), we are still able to use *SQLTT* templates to
keep our queries readable and easy to mantain.

To use them from our non-javascript application, all we need to do is to
compile them using [SQLTT CLI capabilities](#executing-from-cli) with [*_nocli*
engines](#query-output-inspection):


**$ ``SQL_ENGINE=postgresql_nocli node personnel.sql.js listByDept oper``**

```sql
    select id, dptId, dptName, name, sex
    from personnel
    join depts using(dptId)
    where dptId = $1
```

This way we can build simple simple *compilation scripts* such as following
example:

```sh
#!/bin/env sh
export SQL_ENGINE=postgresql_nocli

node sqlsrc/personnel.sql.js list > sql/personnel.list.sql
node sqlsrc/personnel.sql.js listByDept > sql/personnel.listByDept.sql
node sqlsrc/personnel.sql.js show > sql/personnel.show.sql
node sqlsrc/personnel.sql.js insert > sql/personnel.insert.sql
node sqlsrc/personnel.sql.js update > sql/personnel.update.sql

node sqlsrc/articles.sql.js list > sql/articles.list.sql
node sqlsrc/articles.sql.js find > sql/articles.find.sql
node sqlsrc/articles.sql.js show > sql/articles.show.sql
node sqlsrc/articles.sql.js insert > sql/articles.insert.sql
node sqlsrc/articles.sql.js update > sql/articles.update.sql

# ....
```


USAGE MANUAL
============

Table of Contents
-----------------

<!-- vim-markdown-toc GitLab -->

* [ABOUT SQLTT](#about-sqltt)
* [FEATURES](#features)
* [BASIC CONCEPTS](#basic-concepts)
    * [Engines](#engines)
        * [Currently supported engines](#currently-supported-engines)
    * [Engine Flavours and Targets](#engine-flavours-and-targets)
        * [SQL_ENGINE environment variable](#sql_engine-environment-variable)
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
    * [Arguments declaration](#arguments-declaration)
    * [Alternative SQL](#alternative-sql)
    * [Default Engine](#default-engine)
    * [Data](#data)
* [API REFERENCE](#api-reference)
    * [Template API](#template-api)
        * [sql(engFlavour)](#sqlengflavour)
        * [args(argData)](#argsargdata)
        * [concat(str)](#concatstr)
        * [options(optsObject)](#optionsoptsobject)
    * [Tag API](#tag-api)
        * [arg(argName, alias)](#argargname-alias)
        * [include(src [, bindings])](#includesrc-bindings)
        * [keys(), values() and entries()](#keys-values-and-entries)
        * [literal(str)](#literalstr)
    * [Static Methods](#static-methods)
        * [publish(module, tpl)](#publishmodule-tpl)
* [Advanced Features](#advanced-features)
    * [Hooks](#hooks)
    * [SQL Alternatives](#sql-alternatives)
    * [String Concatenation](#string-concatenation)
* [TODO](#todo)
* [Contributing](#contributing)
* [OUTDATED:](#outdated)
    * [Single-query template files:](#single-query-template-files)
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

<!-- vim-markdown-toc -->

ABOUT SQLTT
-----------


<!-- {{{ -->

SQL is a powerful language, but most databases come with their own variations
and nuances.

Even for the same database engine, the syntax used in application libraries and
[CLI](https://en.wikipedia.org/wiki/Command-line_interface#Other_command-line_interfaces)
interpreters usually differ. At least for parametyzed queries.

This often forces developers to modify their queries back and forth to test
them in database CLI or, even worst, when they need to support different
database engines. In which case they are most times forced to mantain
completely different versions of the same query for each supported database.

ORM solutions solve that problem at the cost of generating suboptimal queries
and disallowing most powerful SQL and/or database-specific features.

SQLTT allows us to maintain single version of each query while preserving the
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
  * Very simple, readable and non-intrusive [template
    format](#template-format).

  * Don't Repeat Yourself (DRY):
    - Render SQL [for your application](#from-application) properly
      formatted for one or more database engines. Ex.:
      - PostgreSQL: ``myTpl.sql('postgresql') // select [...] where baz = $1``
      - Oracle: ``myTpl.sql('oracle')'        // select [...] where baz = :1``
      - ...
    - Generate [database-specific CLI versions](#executing-queries) too.
      - PostgreSQL: ``myTpl.sql('postgresql_cli') // select [...] where baz = :baz``
      - Oracle: ``myTpl.sql('oracle_cli') // select [...] where BAZ = '&baz'``
      - Auto: ``myTpl.sql('cli') // Use 'default_cli' unless SQL_ENGINE env var defined``
      - Or even simpler: Direct [call from command line](#executing-from-cli)
        if ['.publish()' method used](#publishmodule-tpl).
    - ...all with **single SQL template source**.

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

### Engines

*SQLTT* is database agnostic in the sense that it only provide a templating
layer and you are responsible to write SQL suitable for your specific
database(s) engine(s).

But, at the same time, it provide you the tools to support multiple SQL syntax
variations with single codebase.

So, depending on targetted database or even if we are generating SQL for an
application library or to be executed in a CLI interpreter, there could be
subtle syntax differences *SQLTT* must care on.

The most obvious one is the way positional parameters must be specified in an
SQL string. Say:

  * ``$1``, ``$2``, ``$3``, ... (Postgresql)
  * ``:1``, ``:2``, ``:3``, ... (Oracle)
  * Etc...

Or even by variable name, at least in many database CLIs:

  * ``:var1``, ``:var2``, ``:var3``, ... (Postgresql)
  * ``'&var1'``, ``'&var2'``, ``'&var3'``, ... (Oracle)
  * Etc...

To handle these specific differences between targetted databases *SQLTT* uses
small specialyzed libraries called *engines*.


#### Currently supported engines

Currently supported engines by SQLTT are:

| Name               | Description                                         |
|:-------------------|:----------------------------------------------------|
| ``default``        | Generic standard (TODO: ANSI compilant) SQL.        |
| ``default_cli``    | Generic standard SQL suitable for CLI interpreters. |
| ``postgresql``     | PostgreSQL-specific SQL.                            |
| ``postgresql_cli`` | PostgreSQL-specific SQL for its CLI (pgsql) client. |
| ``oracle``         | Oracle-specific SQL.                                |
| ``oracle_cli``     | Oracle-specific SQL for its CLI (sqlplus) client.   |


> 🆘

FIXME: Write out this subject...


### Engine Flavours and Targets

As you could see from previous table, we have two engines for each specific
database flavour (PostgreSQL, Oracle, etc..): one targetting SQL for specific
database application libraries and the other, suffixed by *_cli*, for database
CLI interpreters.

Sometimes we will only be interested in addressing desired flavour or desired
target.

For example, when we call the ``.sql()`` method, we are supposed to expect SQL
for a database library. Not for CLI usage. So specifying 'postgresql' stands
for 'posgresql' engine: not 'postgresql_cli'.

On the other hand, when we want to [use it from CLI](from-cli) we may be
interested in only select the cli-specific target but allowing to change the
actual database flavour.

#### SQL_ENGINE environment variable

To do so we can simply specify 'cli'. This way 'default_cli' will be addressed
by default, but it can be overridden by 'SQL_ENGINE' environment variable
(only if exactly 'cli' is specified).

On the other hand, even when 'cli' or *someFlavour_cli* is specified, we can
set *SQL_ENGINE* to 'nocli' or *semeFlavour_nocli* in order to override CLI
engine of selected database flavour.

This can be useful if we only want to visually inspect how our query will be
served to our application through `.sql()` (or `.sql(flavour)`) method.


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
    tpl.sql('cli')
);
```

...except for that it also renders properly formattend "set/define" (depending
on database engine) arguments form commandline arguments.


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
[``default_engine`` option](#optionsoptsobject) is set. For example, for
``temlate_engine: "postgresql"``, *postgresqsl_cli* will be picked for instead.

On the other hand, in case we want to specifically pick for given database
engine flavour when we are going to generate SQL from *CLI*, we can set the
*SQL_ENGINE* environment variable in our shell either by:

  a) Exporting it (Ex.: ``export SQL_ENGINE=postgresql``).

  b) Setting just for single execution (Ex.: ``SQL_ENGINE=oracle node
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

  * **data:**


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


### Arguments declaration

### Alternative SQL

### Default Engine

### Data

(Not yet implemented...)


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



#### options(optsObject)




### Tag API

> 📌 Tag API methods outputs rendered SQL substrings in the propper syntax for
> targetted database engine. Further examples will follow PostgreSQL syntax
> unless otherwise said.


#### arg(argName, alias)

Provide the ability to interpolate an argument by its name.

Argument names can be repeated. They will be rendered in apparition order when
[args() Template API meghod](#argsargdata) called unless different order were
specified through [args property](#arguments-declaration) in template source.


**📝 Parameters:**

  * *argName:* Argument name.
  * *alias:* (Optional) Alias.

**🏃 Shorthand:**

In its simplest form (when *argName* is string and *alias* is not provided)
simple string can be used as a *shorthand*.

> **🗂️ Examples:**
>
>   * Explicit: `${$.arg("argName")}` ➡  `$argName`.
>   * Using shorthand: `${"argName"}` ➡  `$argName`.


**🚀 Enhnanced Behaviour:**

  * If *alias* is provided, it is added after argument interpolation.

> **🗂️ Example:**
>
>   * `${$.arg("foo", "afoo")}` ➡ `$foo as afoo`.

<br />

> 📌 Arguments aren't usually aliased in a query, but they can be placed in the
> projection too in order to complete it with constant data.

  * Passing an object as *argName* it will interpolate all keys as comma
    separated SQL arguments using their values as alias (*alias* argument, if
    given will be ignored).
    - Boolean false will disable alias for given key.
    - Boolean true make key to be used as alias instead.

> **🗂️ Example:**
>
>   * `${$.arg({foo: "afoo", bar: false, baz: true})}` ➡ `$foo as afoo, $bar,
>     $baz as baz`.


  * Using an array instead, will produce the same effect without aliases (if
    *alias* not given or evaluates to false) or using the same name (else
    case).

> **🗂️ Example:**
>
>   * `${$.arg([foo, bar])}` ➡ `$foo, $bar`.
>   * `${$.arg([foo, bar], true)}` ➡ `$foo as foo, $bar as bar`.

<br />

> ⚠ The "as" keyword in previous examples had been written for the sake of
> clarity only.
>
> No "as" keyword is currently rendered as it is invalid in many database engines
> and, for those which accept it, it is optional anyway. Future SQLTT versions
> may render it for engines that support it.



#### include(src [, bindings])

Provide the ability to nest other templates. 


**📝 Parameters:**

  * *src:* SQLTT instance or any valid SQLTT source (including raw string).
  * *bindings:* (Optional) Argument bindings.

**🏃 Shorthand:**

If *src* is an already instantiated SQLTT template and no bindings are needed,
you don't need to use *.include()* at all.


> **🗂️ Examples:**
>
> Considering this simple snippet:
> ```javascript
> const src0 = $=>$`select foo from bar where baz = ${"baz"}`;
> const q0 = new sqltt(src0)
> ```
>
>   * Explicit: `insert into sometable ${$.include(q0)}` ➡  `insert into
>     sometable select foo from bar where baz = $baz`.
>   * Using shorthand: `insert into sometable ${q0}` ➡  `insert into sometable
>     select foo from bar where baz = $baz`.
>   * From Source (using *.include()* required): `insert into sometable
>     ${$.include(src0)}` ➡  `insert into sometable select foo from bar where
>     baz = $baz`.


**🚀 Enhnanced Behaviour:**


**🗂️ Examples:**


#### keys(), values() and entries()



#### literal(str)

Having regular strings are normally interpreted as shorthand for simple
argument interpolations, ``.literal()`` provide a way to inject a raw string.

Since ``select ${$.literal("foo")} from bar`` is the exact same of ``select foo
from bar`` (with no interpolation at all), ``.literal()`` is mostly used
internally by other *Tag API* functions.

But it can also be useful in case we need to insert some calculated substring.

**Example:**

```javascript
tpl.getUserData = new sqltt($ => ({
    sql: $`
        select *
        from ${$.literal(get_table_name("users"))}
        where user_id = ${"user_id"}
    `,
}));
```


### Static Methods


#### publish(module, tpl)

  TODO: Rewrite more detailed...

  * Publishing helper: ``sqltt.publish(module, myTpl);``
    - Assigns ``myTpl`` to ``module.exports`` (so exports it).
    - If template file is directly invoked, outputs *CLI* SQL to stdout.
      - ``node myTpl.sql.js`` outputs general cli output.
      - ``SQL_ENGINE=postgresql node myTpl.sql.js`` outputs postgresql
        flavoured CLI output.
    - If myTpl is a *key: value* object instead, first argument is expected to
      select which query is required.
      - Ex.: ``node myTplLib.sql.js listQuery``
      - If no argument provided in this case, a list of available keys will be
        shown instead.
    - Arguments are wrapped in a *set* commands.
      - Ex.: ``node myTpl.sql parameter1 parameter2 "third parameter"``
      - Ex.: ``node myTplLib.sql listBySection sectionId``


Advanced Features
-----------------

### Hooks

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
tpl.getUserData = new sqltt({
    hooks: {
        // Prettier formatting on CLI output:
        user_profile: (arg, eng) => eng.match(/(^|_)cli$/) && "jsonb_pretty("+arg+") as "+arg,
        // Rename "bigint" cast to 
        bigint: (arg, eng) => eng.match(/^oracle/) && "int",
    },
    sql: $=>$`
        select id, name, ${$.literal("user_profile")}
        from users
        where cast(strCtime as ${$.literal("bigint")}) > ${"fromTimestamp"}
    `,
});
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
tpl.someQuery = new sqltt({
    sql: $=>$`
        /* Regular SQL */
    `,
    altsql: {
        oracle: $=>$`
            /* Oracle specific SQL */
        `
    }
});
```

> 📌 Argument names and order are checked to be the same in all query
> alternatives to ensure its consistency so using *args* property to fix their
> order is hardly encouraged.


### String Concatenation

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

  * Implement Custom Engines:
    - Engines are really simple libraries very easy to implement. But nowadays
      they must be included in SQLTT package.
    - Custom engines will allow users to implement their own engines extending
      default ones just passing them as a specific option.

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
sqltt.publish(module, tpl);                 // Export and make available from CLI
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
$ SQL_ENGINE=oracle node myQuery.sql.js arg1 arg2 # (...)
# You also can directly pipe to that CLI:
$ SQL_ENGINE=postgresql node myQuery.sql.js arg1 arg2 | psql myDb
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
SQL_ENGINE=postgresql node path/to/myQuery.sql.js
```

**For execution:**

```sh
SQL_ENGINE=postgresql node path/to/myQuery.sql.js arg1, arg2 | psql dbName [other_arguments...]
```

**In multiple query format:**

```sh
SQL_ENGINE=postgresql node path/to/myQueryRepo.sql.js queryName
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

sqltt.publish(module, q);
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
sqltt.publish(module, q);
```

> 📌 It does not matter if nested templates are already instantiated (like
> [first example](#simple-template-file)) or not like ([second
> one](#simpler-template-example-with-no-boilerplate)).


### Supported Database Engines

Currently supported engines are:

  * *postgresql:* For PostgreSQL Database.
  * *postgresqlcli:* For PostgreSQL CLI output.
  * *oracle:* For Oracle Database.
  * *oraclecli:* For Oracle CLI output.

...and oracle still lacks CLI implementation (so fails back to default one).

#### Adding more Database Engines

If you are interested in adding more engines or improving existing ones, check
``lib/engines.js`` file (They're too easy to implement) and please, feel free to
send me patches to include your improvements.


