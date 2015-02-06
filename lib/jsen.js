'use strict';
var util = require('util'),
    func = require('./func.js'),
    type = require('./type.js'),
    equal = require('./equal.js'),
    strings = require('./strings.js'),
    SchemaResolver = require('./resolver.js'),
    types = {},
    keywords = {},
    noop = function () { };

types.any = function () {
    return 'true';
};

types.null = function () {
    return 'data === null';
};

types.boolean = function () {
    return 'dataType === "boolean"';
};

types.string = function () {
    return 'dataType === "string"';
};

types.number = function () {
    return 'dataType === "number"';
};

types.integer = function () {
    return 'dataType === "number" && !(data % 1)';
};

types.array = function () {
    return 'type.isArray(data)';
};

types.object = function () {
    return 'type.isObject(data)';
};

keywords.type = function (schema) {
    var specified = type.isArray(schema.type) ?
        schema.type :
        [schema.type];

    return '(' + specified.map(function mapType(type) {
        return (types[type] || noop)() || 'true';
    }).join(' || ') + ')';
};

keywords.enum = function (schema) {
    var arr = schema.enum,
        fu;

    if (!type.isArray(arr)) {
        return 'true';
    }

    fu = func('arr')
        ('for (var i = 0; i < arr.length; i++) {')
            ('if (equal(arr[i], data)) { return true; }')
        ('}')
        ('return false;');

    return '(' + fu.compile().toString() + ')(' + JSON.stringify(arr) + ')';
};

keywords.minimum = function (schema) {
    if (type.isNumber(schema.minimum)) {
        return '!(' + types.number() + ') || data >= ' + schema.minimum;
    }

    return 'true';
};

keywords.exclusiveMinimum = function (schema) {
    if (schema.exclusiveMinimum === true && type.isNumber(schema.minimum)) {
        return '!(' + types.number() + ') || data !== ' + schema.minimum;
    }

    return 'true';
};

keywords.maximum = function (schema) {
    if (type.isNumber(schema.maximum)) {
        return '!(' + types.number() + ') || data <= ' + schema.maximum;
    }

    return 'true';
};

keywords.exclusiveMaximum = function (schema) {
    if (schema.exclusiveMaximum === true && type.isNumber(schema.maximum)) {
        return '!(' + types.number() + ') || data !== ' + schema.maximum;
    }

    return 'true';
};

keywords.multipleOf = function (schema) {
    if (type.isNumber(schema.multipleOf)) {
        return '!(' + types.number() + ') || (data % ' + schema.multipleOf + ') === 0';
    }

    return 'true';
};

keywords.minLength = function (schema) {
    if (type.isInteger(schema.minLength)) {
        return '!(' + types.string() + ') || data.length >= ' + schema.minLength;
    }

    return 'true';
};

keywords.maxLength = function (schema) {
    if (type.isInteger(schema.maxLength)) {
        return '!(' + types.string() + ') || data.length <= ' + schema.maxLength;
    }

    return 'true';
};

keywords.pattern = function (schema) {
    var regex = type.isString(schema.pattern) ?
        new RegExp(schema.pattern) :
        schema.pattern;

    if (type.isRegExp(regex)) {
        return '!(' + types.string() + ') || (' + regex.toString() + ').test(data)';
    }

    return 'true';
};

function walk(schema, key, fu, resolver) {
    schema = resolver.resolve(schema);

    fu('var pass = true')
      ('var dataType = typeof data');

    var keys = Object.keys(schema),
        kw, src, i;

    for (i = 0; i < keys.length; i++) {
        kw = keys[i];
        src = (keywords[kw] || noop)(schema);

        if (src) {
            fu('pass = %s', src)
              ('if (!pass) {')
                ('return false')
              ('}');
        }
    }

    fu('return true');
}

module.exports = function validator(schema) {
    if (!type.isObject(schema)) {
        throw new Error(strings.invalidSchema);
    }

    var fu = func('data'),
        resolver = new SchemaResolver(schema),
        compiled;

    walk(schema, '', fu, resolver);

    compiled = fu.compile({
        schema: schema,
        resolver: resolver,
        type: type,
        equal: equal
    });

    compiled.error = null;

    return compiled;
};