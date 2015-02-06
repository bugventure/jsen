'use strict';
var util = require('util'),
    func = require('./func.js'),
    type = require('./type.js'),
    equal = require('./equal.js'),
    unique = require('./unique.js'),
    strings = require('./strings.js'),
    SchemaResolver = require('./resolver.js'),
    types = {},
    keywords = {},
    noop = function () { },
    jsen;

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

keywords.minItems = function (schema) {
    if (type.isInteger(schema.minItems)) {
        return '!(' + types.array() + ') || data.length >= ' + schema.minItems;
    }

    return 'true';
};

keywords.maxItems = function (schema) {
    if (type.isInteger(schema.maxItems)) {
        return '!(' + types.array() + ') || data.length <= ' + schema.maxItems;
    }

    return 'true';
};

keywords.uniqueItems = function (schema) {
    if (schema.uniqueItems) {
        return '!(' + types.array() + ') || unique(data).length === data.length';
    }

    return 'true';
};

keywords.items = function (schema) {
    var fu;

    if (type.isObject(schema.items)) {
        fu = func('data')
            ('var itemValidator = %s', jsen(schema.items).toString())
            ('for (var i = 0; i < data.length; i++) {')
                ('if (!itemValidator(data[i])) {')
                    ('return false')
                ('}')
            ('}')
            ('return true');
    }
    else if (type.isArray(schema.items)) {
        fu = func('data')
            ('var validator')
            ('var ivs = []');       // item validators

        if (type.isObject(schema.additionalItems)) {
            // additional item validator
            fu('var ai = %s', jsen(schema.additionalItems).toString());
        }
        else {
            fu('var ai = null');
        }

        schema.items.forEach(function forEachSchema(itemSchema, index) {
            if (type.isObject(itemSchema)) {
                fu('ivs[%d] = %s', index, jsen(itemSchema).toString());
            }
        });

        fu('for (var i = 0; i < data.length; i++) {')
              ('validator = ivs[i] || ai')
              ('if (validator && !validator(data[i])) {')
                ('return false')
              ('}')
          ('}')
          ('return true');
    }

    return fu ?
        '!(' + types.array() + ') || (' + fu.compile().toString() + ')(data)' :
        'true';
};

keywords.additionalItems = function (schema) {
    if (schema.additionalItems === false && type.isArray(schema.items)) {
        return '!(' + types.array() + ') || data.length <= ' + schema.items.length;
    }

    return 'true';
};

keywords.maxProperties = function (schema) {
    if (type.isInteger(schema.maxProperties)) {
        return '!(' + types.object() + ') || Object.keys(data).length <= ' + schema.maxProperties;
    }

    return 'true';
};

keywords.minProperties = function (schema) {
    if (type.isInteger(schema.minProperties)) {
        return '!(' + types.object() + ') || Object.keys(data).length >= ' + schema.minProperties;
    }

    return 'true';
};

keywords.required = function (schema) {
    if (!type.isArray(schema.required)) {
        return 'true';
    }

    var fu = func('req')
        ('for (var i = 0; i < req.length; i++) {')
            ('if (data[req[i]] === undefined) {')
                ('return false')
            ('}')
        ('}')
        ('return true')
        .compile().toString();

    return '!(' + types.object() + ') || ' +
        '(' + fu + ')(' + JSON.stringify(schema.required) + ')';
};

keywords.properties = function (schema) {
    var props = schema.properties,
        fu;

    if (!type.isObject(props)) {
        return 'true';
    }

    fu = func()('var props = {}, key');

    Object.keys(props).forEach(function forEachProp(prop) {
        fu('props["%s"] = %s', prop, jsen(props[prop]).toString());
    });

    fu('for(key in props) {')
        ('var dataValue = data[key]')
        ('if (dataValue !== undefined && !props[key](dataValue)) {')
            ('return false')
        ('}')
    ('}')
    ('return true');

    fu = fu.compile().toString();

    return '!(' + types.object() + ') || (' + fu + ')()';
};

keywords.patternProperties = function (schema) {
    var patProps = schema.patternProperties,
        patterns = type.isObject(patProps) ?
            Object.keys(patProps) : [],
        fu;

    if (!patterns.length) {
        return 'true';
    }

    fu = func('')
        ('var patterns = {}')
        ('var keys = Object.keys(data)')
        ('var matches, pattern, key, i, j');

    patterns.forEach(function forEachPattern(pattern) {
        var validator = jsen(patProps[pattern]).toString();
        fu('patterns["%s"] = %s', pattern, validator);
    });

    fu('for (pat in patterns) {')
        ('var regex = new RegExp(pat)')
        ('for (var j = 0; j < keys.length; j++) {')
            ('key = keys[j]')
            ('if (regex.test(key) && !patterns[pat](data[key])) {')
                ('return false')
            ('}')
        ('}')
    ('}')
    ('return true');

    fu = fu.compile().toString();

    return '!(' + types.object() + ') || (' + fu + ')()';
};

keywords.additionalProperties = function (schema) {
    if (schema.additionalProperties === undefined ||
        schema.additionalProperties === true) {
        return 'true';
    }

    var propKeys = type.isObject(schema.properties) ?
            Object.keys(schema.properties) : [],
        patternRegexes = type.isObject(schema.patternProperties) ?
            Object.keys(schema.patternProperties) : [],
        args = [JSON.stringify(propKeys), JSON.stringify(patternRegexes)],
        fu;

    if (schema.additionalProperties === false) {
        fu = func('props', 'patterns')
            ('var keys = Object.keys(data)')
            ('var key')
            ('for (var i = 0; i < keys.length; i++) {')
                ('key = keys[i]')
                ('if (props.indexOf(key) > -1) {')
                    ('continue')
                ('}')
                ('var foundInRegex = false')
                ('for (j = 0; j < patterns.length; j++) {')
                    ('if (new RegExp(patterns[j]).test(key)) {')
                        ('foundInRegex = true')
                        ('break')
                    ('}')
                ('}')
                ('if (!foundInRegex) {')
                    ('return false')
                ('}')
            ('}')
            ('return true');
    }
    else {

    }

    fu = fu.compile().toString();

    return '!(' + types.object() + ') || (' + fu + ')(' + args.join(', ') + ')';
};

function walk(schema, fu, resolver) {
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

jsen = module.exports = function jsen(schema) {
    if (!type.isObject(schema)) {
        throw new Error(strings.invalidSchema);
    }

    var fu = func('data'),
        resolver = new SchemaResolver(schema),
        compiled;

    walk(schema, fu, resolver);

    compiled = fu.compile({
        schema: schema,
        resolver: resolver,
        type: type,
        equal: equal,
        unique: unique
    });

    // console.log(compiled.toString());

    compiled.error = null;

    return compiled;
};