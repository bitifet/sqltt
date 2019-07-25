TO-DO list & notes
==================

TO-DO
-----

  * Implement dependency system:
    - Dependencies will be prepended as CTEs without repetitions
    - ...that is: dependencies of dependencies will be flattened and not repeated.
    - Specify them in 'cte' attribute of source.
    - Name attribute will be mandatory to them and will be used as its alias to
      ensure always using same name.
    - Dependencies with same name won't be repeated, BUT they will be checked
      to be the same object (error will be thrown otherwise).

  * Provide an option to decide, in cli output, whether non specified arguments
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


