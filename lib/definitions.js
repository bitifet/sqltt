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

// Regular Expressions
E.re_cli = /(?:^|_)((?:no)?cli)$/;
E.re_rowtrim = /^(?:\s*\n)*|(?:\n\s*)*$/g;
E.re_spacing = /(\b|$)/g;

// Symbols
E.sym_options = Symbol();

// Prototypes
E.proto_object = Object.getPrototypeOf({});


