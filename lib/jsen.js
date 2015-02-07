'use strict';
var func = require('./func.js'),
    type = require('./type.js'),
    equal = require('./equal.js'),
    unique = require('./unique.js'),
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
    return 'Array.isArray(data)';
};

types.object = function () {
    return 'data && typeof data === "object" && !Array.isArray(data)';
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
        var mul = schema.multipleOf,
            decimals = mul.toString().length - mul.toFixed(0).length - 1,
            pow = decimals > 0 ? Math.pow(10, decimals) : 1;

        return '!(' + types.number() + ') || ((data * ' + pow + ') % ' + (mul * pow) + ') === 0';
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

keywords.items = function (schema, compile) {
    var fu;

    if (type.isObject(schema.items)) {
        fu = func('data')
            ('var itemValidator = %s', compile(schema.items))
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
            fu('var ai = %s', compile(schema.additionalItems));
        }
        else {
            fu('var ai = null');
        }

        schema.items.forEach(function forEachSchema(itemSchema, index) {
            if (type.isObject(itemSchema)) {
                fu('ivs[%d] = %s', index, compile(itemSchema));
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

keywords.properties = function (schema, compile) {
    var props = schema.properties,
        fu;

    if (!type.isObject(props)) {
        return 'true';
    }

    fu = func()('var props = {}, key');

    Object.keys(props).forEach(function forEachProp(prop) {
        fu('props["%s"] = %s', prop, compile(props[prop]));
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

keywords.patternProperties = function (schema, compile) {
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
        var validator = compile(patProps[pattern]);
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

keywords.additionalProperties = function (schema, compile) {
    if (schema.additionalProperties === undefined ||
        schema.additionalProperties === true) {
        return 'true';
    }

    var propKeys = type.isObject(schema.properties) ?
            Object.keys(schema.properties) : [],
        patternRegexes = type.isObject(schema.patternProperties) ?
            Object.keys(schema.patternProperties) : [],
        args = [JSON.stringify(propKeys), JSON.stringify(patternRegexes)],
        forbidden = schema.additionalProperties === false,
        validator = forbidden ?
            null :
            compile(schema.additionalProperties),
        fu;

    fu = func('props', 'patterns')
        ('var keys = Object.keys(data)')
        ('var key');

    if (validator) {
        fu('var validator = %s', validator);
    }

    fu('for (var i = 0; i < keys.length; i++) {')
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
        ('if (!foundInRegex) {');

    if (forbidden) {
        fu('return false');
    }
    else {
        fu('if (!validator(data[key])) {')
            ('return false')
        ('}');
    }

    fu('}')
    ('}')
    ('return true');

    fu = fu.compile().toString();

    return '!(' + types.object() + ') || (' + fu + ')(' + args.join(', ') + ')';
};

keywords.dependencies = function (schema, compile) {
    if (!type.isObject(schema.dependencies)) {
        return 'true';
    }

    var fu = func();

    Object.keys(schema.dependencies).forEach(function forEach(key) {
        var dep = schema.dependencies[key],
            validator;

        fu('if (data["%s"] !== undefined) {', key);

        if (type.isObject(dep)) {
            //schema dependency
            validator = compile(dep);

            fu('var validator = %s', validator)
              ('if (!validator(data)) {')
                ('return false')
              ('}');
        }
        else {
            // property dependency
            dep.forEach(function forEachProp(prop) {
                fu('if (data["%s"] === undefined) {', prop)
                    ('return false')
                  ('}');
            });
        }

        fu('}');
    });

    fu('return true');

    fu = fu.compile().toString();

    return '!(' + types.object() + ') || (' + fu + ')()';
};

keywords.allOf = function (schema, compile) {
    if (!type.isArray(schema.allOf)) {
        return 'true';
    }

    var fu = func()('var validators = [], i');

    schema.allOf.forEach(function forEachSchema(childSchema) {
        fu('validators.push(%s)', compile(childSchema));
    });

    fu('for (i = 0; i < validators.length; i++) {')
        ('if (!validators[i](data)) {')
            ('return false')
        ('}')
      ('}')
      ('return true');

    fu = fu.compile().toString();

    return '(' + fu + ')()';
};

keywords.anyOf = function (schema, compile) {
    if (!type.isArray(schema.anyOf)) {
        return 'true';
    }

    var fu = func()('var validators = [], i');

    schema.anyOf.forEach(function forEachSchema(childSchema) {
        fu('validators.push(%s)', compile(childSchema));
    });

    fu('for (i = 0; i < validators.length; i++) {')
        ('if (validators[i](data)) {')
            ('return true')
        ('}')
      ('}')
      ('return false');

    fu = fu.compile().toString();

    return '(' + fu + ')()';
};

keywords.oneOf = function (schema, compile) {
    if (!type.isArray(schema.oneOf)) {
        return 'true';
    }

    var fu = func()('var validators = [], matches = 0, i');

    schema.oneOf.forEach(function forEachSchema(childSchema) {
        fu('validators.push(%s)', compile(childSchema));
    });

    fu('for (i = 0; i < validators.length; i++) {')
        ('if (validators[i](data)) {')
            ('matches++')
            ('if (matches > 1) {')
                ('return false')
            ('}')
        ('}')
      ('}')
      ('return matches === 1');

    fu = fu.compile().toString();

    return '(' + fu + ')()';
};

keywords.not = function (schema, compile) {
    if (!type.isObject(schema.not)) {
        return 'true';
    }

    return '!(' + compile(schema.not) + ')(data)';
};

function createValidator(schema) {
    if (!type.isObject(schema)) {
        throw new Error(strings.invalidSchema);
    }

    var resolver = new SchemaResolver(schema),
        counter = 0,
        refs = {},
        cache = {};

    function resolve(schema, compileCallback) {
        var deref = resolver.resolve(schema),
            ref = schema.$ref,
            func,
            cached;

        // we have a reference somewhere
        if (schema !== deref) {
            cached = cache[ref];

            // cache the compiled function
            if (!cached) {
                cached = cache[ref] = {
                    key: 'ref' + (counter++),
                    func: function (data) {
                        return func(data);
                    }
                };

                func = compileCallback(deref);

                refs[cached.key] = cached.func;
            }

            // return cached
            return cached.func;
        }

        return compileCallback(deref);
    }

    function source(schema) {
        var func = resolve(schema, compile),
            ref = schema.$ref;

        if (!ref) {
            return func.toString();
        }

        return 'refs["' + cache[ref].key + '"]';
    }

    function compile(schema) {
        var fu, keys, kw, src, i;

        keys = Object.keys(schema);

        fu = func('data')
            ('var pass = true')
            ('var dataType = typeof data');

        for (i = 0; i < keys.length; i++) {
            kw = keys[i];
            src = (keywords[kw] || noop)(schema, source);

            if (src) {
                fu('pass = %s', src)
                  ('if (!pass) {')
                    ('return false')
                  ('}');
            }
        }

        fu('return true');

        return fu.compile({
            schema: schema,
            equal: equal,
            unique: unique,
            refs: refs
        });
    }

    return resolve(schema, compile);
}

module.exports = function jsen(schema) {
    return createValidator(schema);
};

/*
    TODO: Error reporting
          Extensibility (custom formats + types)
          Replace validation in request-validator
*/