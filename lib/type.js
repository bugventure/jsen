'use strict';

function type(obj) {
    var str = Object.prototype.toString.call(obj);
    return str.substr(8, str.length - 9).toLowerCase();
}

function isInteger(obj) {
    return (obj | 0) === obj;
}

function isObject(obj) {
    return type(obj) === 'object';
}

function isRegExp(obj) {
    return type(obj) === 'regexp';
}

type.isInteger = isInteger;
type.isObject = isObject;
type.isRegExp = isRegExp;

module.exports = type;