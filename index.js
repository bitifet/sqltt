// ==================== //
// Sql Tagged Templates //
// ==================== //
"use strict";
const D = require("./lib/definitions");
const _priv_ = D.sym_private;
const hlp = require("./lib/helpers.js");
const privateMethods = require("./lib/privateMethods.js");
const publicMethods = require("./lib/tplAPI.js");
const staticMethods = require("./lib/staticAPI.js");

// Constructor:
function sqltt(sourceTpl, options = {}) {
    const me = this;
    me.version = D.version;
    me[_priv_] = {};
    me[_priv_].options = options;
    Object.entries(privateMethods).map( // Kinda private methods
        ([k,v])=>me[_priv_][k]=hlp.softBind(v, me)
    );
    me[_priv_].loadTemplate(sourceTpl);
    me[_priv_].checkTemplate();
    me.sqlCache = {};
};

// Public methods:
Object.assign(sqltt.prototype, publicMethods);

// Static mehtods and properties:
Object.assign(sqltt, staticMethods);

module.exports = sqltt;

