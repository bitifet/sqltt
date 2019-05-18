// lib/interpolation.js
// ====================
"use strict";
class interpolation {
    constructor(value) {
        this.data = {
            value: value,
            wrap: false,
            alias: false,
        };
    };
    wrap(alias) {
        this.data.wrap = true;
        this.data.alias = alias;
        return this;
    };
    render() {
        const aliasStr = this.data.alias
            ? " " + this.data.alias
            : ""
        ;
        return this.data.wrap
            ? "("+this.data.value+")" + aliasStr
            : this.data.value
        ;
    };
};

module.exports = interpolation;
