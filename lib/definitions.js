// lib/definitions.js
// ==================
"use strict";
const E = module.exports;
const Fs = require("fs");

// Environment
E.engine_env_var = 'SQL_ENGINE';
E.version = JSON.parse(
    Fs.readFileSync(__dirname + "/../package.json")
).version;
E.emulateCli = false;

// Runtime
E.console = console; // Let to mock from tests

// Parsers
E.argParser = (v)=>v===undefined?null:v;
E.cliEscape = s=>s===null ? "NULL" : "'"+s.replace(/'/g, "\\'")+"'";

// Regular Expressions
E.re_cli = /(?:^|_)((?:no)?cli)$/;
E.re_rowtrim = /^(?:\s*\n)*|(?:\n\s*)*$/g;
E.re_spacing = /(\b|$)/g;
E.re_longModifier = /^--(\w+)(?:=(.+))?$/;
E.re_fnLikeArgs = /^(\w+)(?:\s*\(\s*(.*?)\s*\))\s*$/;
E.re_isValidNameList = /^(?:[a-z][a-z0-9]*)(?:(?:\s*,\s*)[a-z][a-z0-9]*)*$/i;

// Symbols
E.sym_private = Symbol();

// Prototypes
E.proto_object = Object.getPrototypeOf({});


