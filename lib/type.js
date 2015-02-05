'use strict';

function toString(obj) {
    return Object.prototype.toString.call(obj);
}

function type(obj) {
    var str = toString(obj);
    return str.substr(8, str.length - 9).toLowerCase();
}

function isString(obj) {
    return type(obj) === 'string';
}

function isNumber(obj) {
    return type(obj) === 'number';
}

function isInteger(obj) {
    return isNumber(obj) && parseInt(obj, 10) === obj;
}

function isBoolean(obj) {
    return type(obj) === 'boolean';
}

function isFunction(obj) {
    return type(obj) === 'function';
}

function isObject(obj) {
    return type(obj) === 'object';
}

function isRegExp(obj) {
    return type(obj) === 'regexp';
}

function isArray(obj) {
    return type(obj) === 'array';
}

function isNull(obj) {
    return type(obj) === 'null';
}

function isUndefined(obj) {
    return type(obj) === 'undefined';
}

function isDefined(obj) {
    return !isNull(obj) && !isUndefined(obj);
}

type.isString = isString;
type.isNumber = isNumber;
type.isInteger = isInteger;
type.isBoolean = isBoolean;
type.isFunction = isFunction;
type.isObject = isObject;
type.isRegExp = isRegExp;
type.isArray = isArray;
type.isNull = isNull;
type.isUndefined = isUndefined;
type.isDefined = isDefined;

module.exports = type;