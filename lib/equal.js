'use strict';

var type = require('./type.js');

function deepEqual(a, b) {
    var keysA = Object.keys(a).sort(),
        keysB = Object.keys(b).sort(),
        i, key;

    if (!equal(keysA, keysB)) {
        return false;
    }

    for (i = 0; i < keysA.length; i++) {
        key = keysA[i];

        if (!equal(a[key], b[key])) {
            return false;
        }
    }

    return true;
}

function equal(a, b) {  // jshint ignore: line
    var typeA = type(a),
        typeB = type(b),
        i;

    if (typeA !== typeB) {
        return false;
    }

    if (typeA === 'object') {
        return deepEqual(a, b);
    }

    if (typeA === 'regexp') {
        return a.toString() === b.toString();
    }

    if (typeA === 'array') {
        if (a.length !== b.length) {
            return false;
        }

        for (i = 0; i < a.length; i++) {
            if (!equal(a[i], b[i])) {
                return false;
            }
        }

        return true;
    }

    return a === b;
}

module.exports = equal;