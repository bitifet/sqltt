SQLTT - USAGE MANUAL
====================

Index
-----

<!-- vim-markdown-toc GitLab -->

* [Basic Concepts](#basic-concepts)
* [Template Syntax](#template-syntax)
* [API Reference](#api-reference)
    * [Template API](#template-api)
        * [sql(engFlavour)](#sqlengflavour)
        * [args(argData)](#argsargdata)
        * [concat(str)](#concatstr)
        * [split(engFlavour)](#splitengflavour)
    * [Tag API](#tag-api)
        * [arg(argName)](#argargname)
        * [literal(str)](#literalstr)
        * [include(src [, bindings])](#includesrc-bindings)
    * [keys(), values() and entries()](#keys-values-and-entries)

<!-- vim-markdown-toc -->





Basic Concepts
--------------



Template Syntax
---------------


API Reference
-------------

*SQLTT* involves two API interfaces:

  * [Template API](#template-api): That is the methods we have available from
    any *SQLTT* instantiated template.

  * [Tag API](#tag-api): Consisting on various methods attached to the tag
    function our template will receive during its compilation.


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

