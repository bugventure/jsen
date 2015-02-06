/* global describe, it */
'use strict';

var assert = require('assert'),
    type = require('../lib/type.js');

describe('type', function () {
    it('isString', function () {
        assert(type.isString(''));
        assert(type.isString('abc'));
        assert(!type.isString(null));
        assert(!type.isString(undefined));
        assert(!type.isString(123));
        assert(!type.isString({}));
        assert(!type.isString([]));
    });

    it('isNumber', function () {
        assert(type.isNumber(Math.PI));
        assert(type.isNumber(0));
        assert(!type.isNumber('123'));
        assert(!type.isNumber(null));
        assert(!type.isNumber(undefined));
        assert(!type.isNumber({}));
        assert(!type.isNumber([]));
    });

    it('isInteger', function () {
        assert(type.isNumber(0));
        assert(type.isInteger(7));
        assert(!type.isInteger(Math.E));
        assert(!type.isNumber('123'));
        assert(!type.isNumber(null));
        assert(!type.isNumber(undefined));
        assert(!type.isNumber({}));
        assert(!type.isNumber([]));
    });

    it('isBoolean', function () {
        assert(type.isBoolean(false));
        assert(type.isBoolean(true));
        assert(!type.isBoolean('false'));
        assert(!type.isBoolean(0));
        assert(!type.isBoolean(null));
        assert(!type.isBoolean(undefined));
        assert(!type.isBoolean([]));
        assert(!type.isBoolean({}));
    });

    it('isFunction', function () {
        assert(type.isFunction(function () { }));
        assert(!type.isFunction('function () { }'));
        assert(!type.isFunction(null));
        assert(!type.isFunction(0));
        assert(!type.isFunction([]));
        assert(!type.isFunction({}));
    });

    it('isObject', function () {
        assert(type.isObject({}));
        assert(!type.isObject([]));
        assert(!type.isObject(null));
        assert(!type.isObject());
        assert(!type.isObject(new Date()));
        assert(!type.isObject(/a/));
    });

    it('isRegex', function () {
        assert(type.isRegExp(/a/));
        assert(type.isRegExp(new RegExp('a')));
        assert(!type.isRegExp({}));
        assert(!type.isRegExp([]));
    });

    it('isArray', function () {
        assert(type.isArray([]));
        assert(type.isArray([1, 2, 3]));
        assert(!type.isArray({}));
        assert(!type.isArray(null));
        assert(!type.isArray());
    });

    it('isNull', function () {
        assert(type.isNull(null));
        assert(!type.isNull());
        assert(!type.isNull(0));
        assert(!type.isNull({}));
        assert(!type.isNull([]));
    });

    it('isUndefined', function () {
        assert(type.isUndefined());
        assert(type.isUndefined(undefined));
        assert(!type.isUndefined(null));
        assert(!type.isUndefined({}));
        assert(!type.isUndefined([]));
        assert(!type.isUndefined(0));
    });

    it('isDefined', function () {
        assert(type.isDefined(0));
        assert(type.isDefined(false));
        assert(type.isDefined(''));
        assert(!type.isDefined(null));
        assert(!type.isDefined());
    });
});