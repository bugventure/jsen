'use strict';

var func = require('./func.js'),
    type = require('./type.js'),
    equal = require('./equal.js'),
    unique = require('./unique.js'),
    strings = require('./strings.js'),
    SchemaResolver = require('./resolver.js'),
    formats = require('./formats.js'),
    types = {},
    keywords = {};

types.null = function (path) {
    return path + ' === null';
};

types.boolean = function (path) {
    return 'typeof ' + path + ' === "boolean"';
};

types.string = function (path) {
    return 'typeof ' + path + ' === "string"';
};

types.number = function (path) {
    return 'typeof ' + path + ' === "number"';
};

types.integer = function (path) {
    return 'typeof ' + path + ' === "number" && !(' + path + ' % 1)';
};

types.array = function (path) {
    return 'Array.isArray(' + path + ')';
};

types.object = function (path) {
    return 'typeof ' + path + ' === "object" && ' + path + ' && !Array.isArray(' + path + ')';
};

keywords.type = function (context) {
    if (!context.schema.type) {
        return;
    }

    var specified = Array.isArray(context.schema.type) ? context.schema.type : [context.schema.type],
        src = specified.map(function mapType(type) {
            return types[type](context.path) || 'true';
        }).join(' || ');

    if (src) {
        context.code('ok = ok && (' + src + ')');
    }
};

keywords.enum = function (context) {
    var arr = context.schema.enum,
        clauses = [],
        value, enumType, i;

    if (!Array.isArray(arr)) {
        return;
    }

    for (i = 0; i < arr.length; i++) {
        value = arr[i];
        enumType = typeof value;

        if (value === null || ['boolean', 'number', 'string'].indexOf(enumType) > -1) {
            // simple equality check for simple data types
            if (enumType === 'string') {
                clauses.push(context.path + ' === "' + value + '"');
            }
            else {
                clauses.push(context.path + ' === ' + value);
            }
        }
        else {
            // deep equality check for complex types or regexes
            clauses.push('equal(' + context.path + ', ' + JSON.stringify(value) + ')');
        }
    }

    context.code('ok = ok && (' + clauses.join(' || ') + ')');
};

keywords.minimum = function (context) {
    if (typeof context.schema.minimum === 'number') {
        context.code('ok = ok && (!(' + types.number(context.path) + ') || ' + context.path + ' >= ' + context.schema.minimum + ')');
    }
};

keywords.exclusiveMinimum = function (context) {
    if (context.schema.exclusiveMinimum === true && typeof context.schema.minimum === 'number') {
        context.code('ok = ok && ' + context.path + ' !== ' + context.schema.minimum);
    }
};

keywords.maximum = function (context) {
    if (typeof context.schema.maximum === 'number') {
        context.code('ok = ok && (!(' + types.number(context.path) + ') || ' + context.path + ' <= ' + context.schema.maximum + ')');
    }
};

keywords.exclusiveMaximum = function (context) {
    if (context.schema.exclusiveMaximum === true && typeof context.schema.maximum === 'number') {
        context.code('ok = ok && ' + context.path + ' !== ' + context.schema.maximum);
    }
};

keywords.multipleOf = function (context) {
    if (typeof context.schema.multipleOf === 'number') {
        var mul = context.schema.multipleOf,
            decimals = mul.toString().length - mul.toFixed(0).length - 1,
            pow = decimals > 0 ? Math.pow(10, decimals) : 1,
            path = context.path;

        if (decimals > 0) {
            context.code('ok = ok && (!(' + types.number(path) + ') || (+(Math.round((' + path + ' * ' + pow + ') + "e+" + ' + decimals + ') + "e-" + ' + decimals + ') % ' + (mul * pow) + ') === 0)');
        } else {
            context.code('ok = ok && (!(' + types.number(path) + ') || ((' + path + ' * ' + pow + ') % ' + (mul * pow) + ') === 0)');
        }
    }
};

keywords.minLength = function (context) {
    if (type.isInteger(context.schema.minLength)) {
        context.code('ok = ok && (!(' + types.string(context.path) + ') || ' + context.path + '.length >= ' + context.schema.minLength + ')');
    }
};

keywords.maxLength = function (context) {
    if (type.isInteger(context.schema.maxLength)) {
        context.code('ok = ok && (!(' + types.string(context.path) + ') || ' + context.path + '.length <= ' + context.schema.maxLength + ')');
    }
};

keywords.pattern = function (context) {
    var regex = typeof context.schema.pattern === 'string' ?
        new RegExp(context.schema.pattern) :
        context.schema.pattern;

    if (type.isRegExp(regex)) {
        context.code('ok = ok && (!(' + types.string(context.path) + ') || (' + regex.toString() + ').test(' + context.path + '))');
    }
};

keywords.format = function (context) {
    if (typeof context.schema.format !== 'string' || !formats[context.schema.format]) {
        return;
    }

    context.code('ok = ok && (!(' + types.string(context.path) + ') || (' + formats[context.schema.format].toString() + ').test(' + context.path + '))');
};

keywords.minItems = function (context) {
    if (type.isInteger(context.schema.minItems)) {
        context.code('ok = ok && (!(' + types.array(context.path) + ') || ' + context.path + '.length >= ' + context.schema.minItems + ')');
    }
};

keywords.maxItems = function (context) {
    if (type.isInteger(context.schema.maxItems)) {
        context.code('ok = ok && (!(' + types.array(context.path) + ') || ' + context.path + '.length <= ' + context.schema.maxItems + ')');
    }
};

keywords.additionalItems = function (context) {
    if (context.schema.additionalItems === false && Array.isArray(context.schema.items)) {
        context.code('ok = ok && !(' + types.array(context.path) + ') || ' + context.path + '.length <= ' + context.schema.items.length);
    }
};

keywords.uniqueItems = function (context) {
    if (context.schema.uniqueItems) {
        context.code('ok = ok && (!(' + types.array(context.path) + ') || unique(' + context.path + ').length === ' + context.path + '.length)');
    }
};

keywords.items = function (context) {
    var index = context.declare(0),
        i = 0;

    context.code('if (ok && ' + types.array(context.path) + ') {');

    if (type(context.schema.items) === 'object') {
        context.code('for (' + index + '; ' + index + ' < ' + context.path + '.length; ' + index + '++) {');

        context.validate(context.path + '[' + index + ']', context.schema.items);

        context.code('if (!ok) {')
            ('break')
        ('}');

        context.code('}');
    }
    else if (Array.isArray(context.schema.items)) {
        for (; i < context.schema.items.length; i++) {
            context.code('if (' + context.path + '.length - 1 >= ' + i + ') {');

            context.validate(context.path + '[' + i + ']', context.schema.items[i]);

            context.code('}');
        }

        if (type.isObject(context.schema.additionalItems)) {
            context.code('for (' + index + ' = ' + i + '; ' + index + ' < ' + context.path + '.length; ' + index + '++) {');

            context.validate(context.path + '[' + index + ']', context.schema.additionalItems);

            context.code('if (!ok) {')
                ('break')
            ('}')

            ('}');
        }
    }

    context.code('}');
};

keywords.maxProperties = function (context) {
    if (type.isInteger(context.schema.maxProperties)) {
        context.code('ok = ok && !(' + types.object(context.path) + ') || Object.keys(' + context.path + ').length <= ' + context.schema.maxProperties);
    }
};

keywords.minProperties = function (context) {
    if (type.isInteger(context.schema.minProperties)) {
        context.code('ok = ok && !(' + types.object(context.path) + ') || Object.keys(' + context.path + ').length >= ' + context.schema.minProperties);
    }
};

keywords.required = function (context) {
    if (!Array.isArray(context.schema.required)) {
        return;
    }

    context.code('if (ok && ' + types.object(context.path) + ') {');

    for (var i = 0; i < context.schema.required.length; i++) {
        context.code('ok = ok && ' + context.path + '.' + context.schema.required[i] + ' !== undefined');
    }

    context.code('}');
};

keywords.properties =
keywords.patternProperties =
keywords.additionalProperties = function (context) {
    if (context.validatedProperties) {
        // prevent multiple generations of this function
        return;
    }

    var props = context.schema.properties,
        propKeys = type(props) === 'object' ? Object.keys(props) : [],
        patProps = context.schema.patternProperties,
        patterns = type(patProps) === 'object' ? Object.keys(patProps) : [],
        addProps = context.schema.additionalProperties,
        addPropsCheck = addProps === false || type(addProps) === 'object',
        key, found,
        propKey, pattern, i;

    if (!propKeys.length && !patterns.length && !addPropsCheck) {
        return;
    }

    key = context.declare('""');

    if (addPropsCheck) {
        found = context.declare(false);
    }

    context.code('if (ok && ' + types.object(context.path) + ') {')
        ('for (' + key + ' in ' + context.path + ') {');

    if (addPropsCheck) {
        context.code(found + ' = false');
    }

    // validate regular properties
    for (i = 0; i < propKeys.length; i++) {
        propKey = propKeys[i];

        context.code('if (ok && ' + key + ' === "' + propKey + '") {');

        if (addPropsCheck) {
            context.code(found + ' = true');
        }

        context.validate(context.path + '[' + key + ']', props[propKey]);

        context.code('}');
    }

    // validate pattern properties
    for (i = 0; i < patterns.length; i++) {
        pattern = patterns[i];

        context.code('if (ok && (' + new RegExp(pattern).toString() + ').test(' + key + ')) {');

        if (addPropsCheck) {
            context.code(found + ' = true');
        }

        context.validate(context.path + '[' + key + ']', patProps[pattern]);

        context.code('}');
    }

    // validate additional properties
    if (addPropsCheck) {
        context.code('if (ok && !' + found + ') {');

        if (addProps === false) {
            // do not allow additional properties
            context.code('ok = false');
        }
        else {
            // validate additional properties
            context.validate(context.path + '[' + key + ']', addProps);
        }

        context.code('}');
    }

    context.code('if (!ok) {')
        ('break')
    ('}');

    context.code('}')
    ('}');

    context.validatedProperties = true;
};

keywords.dependencies = function (context) {
    if (type(context.schema.dependencies) !== 'object') {
        return;
    }

    var key, dep, i = 0;

    context.code('if (ok && ' + types.object(context.path) + ') {');

    for (key in context.schema.dependencies) {
        dep = context.schema.dependencies[key];

        context.code('if (ok && ' + context.path + '["' + key + '"] !== undefined) {');

        if (type(dep) === 'object') {
            //schema dependency
            context.validate(context.path, dep);
        }
        else {
            // property dependency
            for (i; i < dep.length; i++) {
                context.code('ok = ok && ' + context.path + '["' + dep[i] + '"] !== undefined');
            }
        }

        context.code('}');
    }

    context.code('}');
};

keywords.$ref = function (context) {
    if (!context.schema.$ref) {
        return;
    }

    var compiled = context.compile(context.schema);

    context.code('ok = ok && ' + compiled + '(' + context.path + ')');
};

function jsen(schema) {
    if (!type.isObject(schema)) {
        throw new Error(strings.invalidSchema);
    }

    var resolver = new SchemaResolver(schema),
        counter = 0,
        id = function () { return 'i' + (counter++); },
        funcache = {},
        refs = {},
        scope = {
            equal: equal,
            unique: unique,
            refs: refs
        };

    function cacheCompile(schema) {
        var deref = resolver.resolve(schema),
            ref = schema.$ref,
            cached = funcache[ref],
            func;

        if (!cached) {
            cached = funcache[ref] = {
                key: id(),
                func: function (data) {
                    return func(data);
                }
            };

            func = compile(deref);

            refs[cached.key] = cached.func;
        }

        return 'refs.' + cached.key;
    }

    function compile(schema) {
        function declare(def) {
            var variname = id();

            source.def(variname, def);

            return variname;
        }

        function validate(path, schema) {
            var context = {
                    path: path,
                    schema: schema,
                    code: source,
                    declare: declare,
                    compile: cacheCompile,
                    validate: validate
                },
                keys = Object.keys(schema),
                generator, i;

            for (i = 0; i < keys.length; i++) {
                generator = keywords[keys[i]];

                if (generator) {
                    generator(context);
                }
            }
        }

        var source = func('data')
            ('var ok = true');

        validate('data', schema);

        source('return ok');

        return source.compile(scope);
    }

    return compile(schema);
}

module.exports = jsen;