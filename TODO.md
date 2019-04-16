TO-DO list & notes
==================

TO-DO
-----

  * Implement `$.keys(obj)`, `$.values(obj)` and `$.both(obj)` to retrieve
    comma separated lists of, respectively, *obj* keys (as literals), *obj*
    values (mapped through `$.arg()`) and pairs of the former joined by '='.
    This will ease the building of large insert or updates based on
    `{fieldName: "argName", ...}` JSON specifications.

  * Implement *cliArgs* option for providding arguments for *cli* engine
    flavours in order to allow templates to pick them. For example to build
    files exporting multiple templates and allow cli usage too by picking
    derired query through first argument (Ex: `node myTplFile.sql.js
    templateName --postgresql arg1 arg2...`).


Notes
-----

### Oracle equivalences

https://wiki.postgresql.org/wiki/Oracle_to_Postgres_Conversion

