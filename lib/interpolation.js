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
    wrap() {
        this.data.wrap = true;
        return this;
    };
    alias(alias) {
        this.data.alias = alias;
        return this;
    };
    render() {
        let value = this.data.value;
        if (this.data.wrap) value = "("+value+")";
        if (this.data.alias) value = value + " " + this.data.alias;
        return value;
    };
};

module.exports = interpolation;
