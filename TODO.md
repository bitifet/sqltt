TO-DO list & notes
==================

TO-DO
-----

  * Provide an option to decide, in cli output, wether non specified arguments
    will default to empty strings or its *set* commands not rendered at all (in
    order to respect previously setted values).

  * ...Consider an option for nulls too:
    - Ex.: `\set foo null; ... where foo = coalesce( :foo , 'default')`

  * DOCUMENTATE `$.keys(obj)`, `$.values(obj)` and `$.entries(obj)` to retrieve
    comma separated lists of, respectively, *obj* keys (as literals), *obj*
    values (mapped through `$.arg()`) and pairs of the former joined by '='.
    This will ease the building of large insert or updates based on
    `{fieldName: "argName", ...}` JSON specifications.

  * Implement conditionals (`$.if(cbk, thenPart, elsePart)`).
    - cbk() will receive .sql()'s (optional) arguments parameter.
      - (still named *cliArgs* but it could become -optional- *args* only)
    - If returns a true value, *thenPart* is rendered.
    - Else *elsePart* is rendered instead.
    - *thenPart* and *elsePart* could be from simple string literals to whole
      subtemplates, arguments, etc...

  * Rename .sql()'s *cliArgs* argument to simply *args*.
    - Allow them to be simple array of argument names (to specify which are
      expected to be defined).

  * Improve .concat() concatenation (check for trailing space/return and add if
    neccessary).


Notes
-----

### Oracle equivalences

https://wiki.postgresql.org/wiki/Oracle_to_Postgres_Conversion

