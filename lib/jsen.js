'use strict';
var func = require('./func.js'),
    type = require('./type.js'),
    equal = require('./equal.js'),
    unique = require('./unique.js'),
    strings = require('./strings.js'),
    SchemaResolver = require('./resolver.js'),
    types = {
        null: 'data === null',
        boolean: 'type === "boolean"',
        string: 'type === "string"',
        number: 'type === "number"',
        integer: 'type === "number" && !(data % 1)',
        array: 'type === "array"',
        object: 'type === "object"'
    },
    keywords = {},
    formats = {};

keywords.type = function (context) {
    var specified = Array.isArray(context.schema.type) ? context.schema.type : [context.schema.type],
        src =  specified.map(function mapType(type) {
            return types[type] || 'true';
        }).join(' || ');

    if (src) {
        context.code('ok = ok && (' + src + ')');
    }
};

keywords.enum = function (context) {
    var arr = context.schema.enum,
        clauses = [],
        value,
        i;

    if (!Array.isArray(arr)) {
        return;
    }

    for (i = 0; i < arr.length; i++) {
        value = arr[i];

        if (value === null || ['boolean', 'number', 'string'].indexOf(typeof value) > -1) {
            // simple equality check for simple data types
            clauses.push('data === ' + JSON.stringify(value));
        }
        else {
            // deep equality check for complex types or regexes
            clauses.push('equal(data, ' + JSON.stringify(value) + ')');
        }
    }

    context.code('ok = ok && (' + clauses.join(' || ') + ')');
};

keywords.minimum = function (context) {
    if (typeof context.schema.minimum === 'number') {
        context.code('ok = ok && (!(' + types.number + ') || data >= ' + context.schema.minimum + ')');
    }
};

keywords.exclusiveMinimum = function (context) {
    if (context.schema.exclusiveMinimum === true && typeof context.schema.minimum === 'number') {
        context.code('ok = ok && data !== ' + context.schema.minimum);
    }
};

keywords.maximum = function (context) {
    if (typeof context.schema.maximum === 'number') {
        context.code('ok = ok && (!(' + types.number + ') || data <= ' + context.schema.maximum + ')');
    }
};

keywords.exclusiveMaximum = function (context) {
    if (context.schema.exclusiveMaximum === true && typeof context.schema.maximum === 'number') {
        context.code('ok = ok && data !== ' + context.schema.maximum);
    }
};

keywords.multipleOf = function (context) {
    if (typeof context.schema.multipleOf === 'number') {
        var mul = context.schema.multipleOf,
            decimals = mul.toString().length - mul.toFixed(0).length - 1,
            pow = decimals > 0 ? Math.pow(10, decimals) : 1;

        if (decimals > 0) {
            context.code('ok = ok && (!(' + types.number + ') || (+(Math.round((data * ' + pow + ') + "e+" + ' + decimals + ') + "e-" + ' + decimals + ') % ' + (mul * pow) + ') === 0)');
        } else {
            context.code('ok = ok && (!(' + types.number + ') || ((data * ' + pow + ') % ' + (mul * pow) + ') === 0)');
        }
    }
};

keywords.minLength = function (context) {
    if (type.isInteger(context.schema.minLength)) {
        context.code('ok = ok && (!(' + types.string + ') || data.length >= ' + context.schema.minLength + ')');
    }
};

keywords.maxLength = function (context) {
    if (type.isInteger(context.schema.maxLength)) {
        context.code('ok = ok && (!(' + types.string + ') || data.length <= ' + context.schema.maxLength + ')');
    }
};

keywords.pattern = function (context) {
    var regex = typeof context.schema.pattern === 'string' ?
        new RegExp(context.schema.pattern) :
        context.schema.pattern;

    if (type.isRegExp(regex)) {
        context.code('ok = ok && (!(' + types.string + ') || (' + regex.toString() + ').test(data))');
    }
};

keywords.format = function (context) {
    if (typeof context.schema.format !== 'string' || !formats[context.schema.format]) {
        return;
    }

    context.code('ok = ok && (!(' + types.string + ') || (' + formats[context.schema.format].toString() + ').test(data))');
};

keywords.minItems = function (context) {
    if (type.isInteger(context.schema.minItems)) {
        context.code('ok = ok && (!(' + types.array + ') || data.length >= ' + context.schema.minItems + ')');
    }
};

keywords.maxItems = function (context) {
    if (type.isInteger(context.schema.maxItems)) {
        context.code('ok = ok && (!(' + types.array + ') || data.length <= ' + context.schema.maxItems + ')');
    }
};

keywords.uniqueItems = function (context) {
    if (context.schema.uniqueItems) {
        context.code('ok = ok && (!(' + types.array + ') || unique(data).length === data.length)');
    }
};

keywords.items = function (context) {
    var index = context.declare(0),
        validator,
        i = 0;

    context.code('if (ok && %s) {', types.array);

    if (type.isObject(context.schema.items)) {
        validator = context.declare(context.compile(context.schema.items));

        context.code('for (%s; %s < data.length; %s++) {', index, index, index)
            ('if (!%s(data[%s])) {', validator, index)
                ('ok = false')
                ('break')
            ('}')
        ('}');
    }
    else if (Array.isArray(context.schema.items)) {
        for (; i < context.schema.items.length; i++) {
            context.code('ok = ok && (data.length - 1 < %s || %s(data[%s]))', i, context.compile(context.schema.items[i]), i);
        }

        if (type.isObject(context.schema.additionalItems)) {
            validator = context.declare(context.compile(context.schema.additionalItems));

            context.code('for (%s = %s; %s < data.length; %s++) {', index, i, index, index)
                ('if (!%s(data[%s])) {', validator, index)
                    ('ok = false')
                    ('break')
                ('}')
            ('}');
        }
    }

    context.code('}');
};

keywords.additionalItems = function (context) {
    if (context.schema.additionalItems === false && Array.isArray(context.schema.items)) {
        context.code('ok = ok && !(' + types.array + ') || data.length <= ' + context.schema.items.length);
    }
};

keywords.maxProperties = function (context) {
    if (type.isInteger(context.schema.maxProperties)) {
        context.code('ok = ok && !(' + types.object + ') || keys.length <= ' + context.schema.maxProperties);
    }
};

keywords.minProperties = function (context) {
    if (type.isInteger(context.schema.minProperties)) {
        context.code('ok = ok && !(' + types.object + ') || keys.length >= ' + context.schema.minProperties);
    }
};

keywords.required = function (context) {
    if (!Array.isArray(context.schema.required)) {
        return;
    }

    context.code('if (ok && %s) {', types.object);

    for (var i = 0; i < context.schema.required.length; i++) {
        context.code('ok = ok && data.%s !== undefined', context.schema.required[i]);
    }

    context.code('}');
};

keywords.properties = function (context) {
    var props = context.schema.properties,
        prop, validator;

    if (!type.isObject(props)) {
        return;
    }

    context.code('if (ok && %s) {', types.object);

    for (prop in props) {
        validator = context.compile(props[prop]);

        context.code('ok = ok && (data.%s === undefined || %s(data.%s))', prop, validator, prop);
    }

    context.code('}');
};

keywords.patternProperties = function (context) {
    var patProps = context.schema.patternProperties,
        patterns = type.isObject(patProps) ?
            Object.keys(patProps) : [],
        pattern,
        patternValidators,
        regex,
        key,
        i;

    if (!patterns.length) {
        return;
    }

    pattern = context.declare('""');
    regex = context.declare();
    key = context.declare('""');
    i = context.declare(0);

    patternValidators = context.declare('{ ' + patterns.map(function mapPattern(pattern) {
        return '"' + pattern + '": ' + context.compile(patProps[pattern]);
    }).join(', ') + ' }');

    context.code('if (ok && %s) {', types.object)
        ('brkpt:')    // break point
          ('for (%s in %s) {', pattern, patternValidators)
            ('%s = new RegExp(%s)', regex, pattern)
            ('for (%s = 0; %s < keys.length; %s++) {', i, i, i)
                ('%s = keys[%s]', key, i)
                ('if (%s.test(%s) && !%s[%s](data[%s])) {', regex, key, patternValidators, pattern, key)
                    ('ok = false')
                    ('break brkpt')
                ('}')
            ('}')
        ('}')
    ('}');
};

keywords.additionalProperties = function (context) {
    if (context.schema.additionalProperties === undefined ||
        context.schema.additionalProperties === true) {
        return;
    }

    var propKeys = type.isObject(context.schema.properties) ?
            Object.keys(context.schema.properties) : [],
        patternRegexes = type.isObject(context.schema.patternProperties) ?
            Object.keys(context.schema.patternProperties) : [],
        forbidden = context.schema.additionalProperties === false,
        validator = forbidden ?
            null :
            context.compile(context.schema.additionalProperties),
        properties, key, found, regexes, i, j;

    properties = context.declare(JSON.stringify(propKeys));
    key = context.declare('""');
    found = context.declare('false');
    regexes = context.declare(JSON.stringify(patternRegexes));
    i = context.declare(0);
    j = context.declare(0);

    context.code('if (ok && %s) {', types.object)
        ('for (%s; %s < keys.length; %s++) {', i, i, i)
            ('%s = keys[%s]', key, i)

            ('if (%s.indexOf(%s) > -1) {', properties, key)
                ('continue')
            ('}')

            ('%s = false', found)

            ('for (%s = 0; %s < %s.length; %s++) {', j, j, regexes, j)
                ('if (new RegExp(%s[%s]).test(%s)) {', regexes, j, key)
                    ('%s = true', found)
                    ('break')
                ('}')
            ('}')

            ('if (!%s) {', found);

    if (forbidden) {
        context.code('ok = false')
          ('break');
    }
    else {
        context.code('if (!%s(data[%s])) {', context.declare(validator), key)
            ('ok = false')
            ('break')
        ('}');
    }

    context.code('}')

    ('}')

    ('}');
};

keywords.dependencies = function (context) {
    if (!type.isObject(context.schema.dependencies)) {
        return;
    }

    var key, dep, i = 0;

    context.code('if (ok && %s) {', types.object);

    for (key in context.schema.dependencies) {
        dep = context.schema.dependencies[key];

        context.code('if (data["%s"] !== undefined) {', key);

        if (type.isObject(dep)) {
            //schema dependency
            context.code('if (!%s(data)) {', context.compile(dep))
                ('ok = false')
            ('}');
        }
        else {
            // property dependency
            for (i; i < dep.length; i++) {
                context.code('if (data["%s"] === undefined) {', dep[i])
                    ('ok = false')
                ('}');
            }
        }

        context.code('}');
    }

    context.code('}');
};

keywords.allOf = function (context) {
    if (!Array.isArray(context.schema.allOf)) {
        return;
    }

    context.code('if (ok) {');

    for (var i = 0; i < context.schema.allOf.length; i++) {
        context.code('ok = ok && %s(data)', context.compile(context.schema.allOf[i]));
    }

    context.code('}');
};

keywords.anyOf = function (context) {
    if (!Array.isArray(context.schema.anyOf)) {
        return;
    }

    var found = context.declare('false'),
        i = 0;

    context.code('if (ok) {');

    for (; i < context.schema.anyOf.length; i++) {
        context.code('%s = %s || %s(data)', found, found, context.compile(context.schema.anyOf[i]));
    }

    context.code('ok = %s', found)
    ('}');
};

keywords.oneOf = function (context) {
    if (!Array.isArray(context.schema.oneOf)) {
        return;
    }

    var matching = context.declare(0),
        i = 0;

    context.code('if (ok) {');

    for (; i < context.schema.oneOf.length; i++) {
        context.code('if (%s <= 1 && %s(data)) {', matching, context.compile(context.schema.oneOf[i]))
            ('%s++', matching)
        ('}');
    }

    context.code('ok = %s === 1', matching)
    ('}');
};

keywords.not = function (context) {
    if (type.isObject(context.schema.not)) {
        context.code('ok = ok && !' + context.compile(context.schema.not) + '(data)');
    }
};

// reference: http://dansnetwork.com/javascript-iso8601rfc3339-date-parser/
formats['date-time'] = /(\d\d\d\d)(-)?(\d\d)(-)?(\d\d)(T)?(\d\d)(:)?(\d\d)(:)?(\d\d)(\.\d+)?(Z|([+-])(\d\d)(:)?(\d\d))/;
// reference: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js#L7
formats.uri = /^[a-zA-Z][a-zA-Z0-9+-.]*:[^\s]*$/;
// reference: http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
//            http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'willful violation')
formats.email = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
// reference: https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
formats.ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
// reference: http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
formats.ipv6 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
// reference: http://stackoverflow.com/questions/106179/regular-expression-to-match-dns-hostname-or-ip-address#answer-3824105
formats.hostname = /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]))*$/;

function createValidator(schema) {
    if (!type.isObject(schema)) {
        throw new Error(strings.invalidSchema);
    }

    var resolver = new SchemaResolver(schema),
        counter = 0,
        refs = {},
        funcache = {},
        context = {
            equal: equal,
            unique: unique,
            refs: refs
        };

    function id() {
        return 'i' + (counter++);
    }

    function resolve(schema, compileCallback) {
        var deref = resolver.resolve(schema),
            ref = schema.$ref,
            func,
            cached;

        // we have a reference somewhere
        if (schema !== deref) {
            cached = funcache[ref];

            // cache the compiled function
            if (!cached) {
                cached = funcache[ref] = {
                    key: id(),
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

    function cacheCompile(schema) {
        var compiled = resolve(schema, compile),
            ref = schema.$ref,
            key;

        if (ref) {
            return 'refs.' + funcache[ref].key;
        }

        key = id();

        refs[key] = compiled;

        return 'refs.' + key;
    }

    function compile(schema) {
        var source, keys, generator, i;

        keys = Object.keys(schema);

        function declare() {
            var variname = id(),
                args = [].slice.call(arguments, 0);

            args.unshift(variname);

            source.def.apply(source, args);

            return variname;
        }

        source = func('data')
            ('var ok = true')           // valid by default
            ('var type = typeof data')  // type
            ('type = type === "object" ? (!data ? "null" : (Array.isArray(data) ? "array" : type)) : type')
            ('var keys = type === "object" ? Object.keys(data) : []');

        for (i = 0; i < keys.length; i++) {
            generator = keywords[keys[i]];

            if (generator) {
                generator({
                    schema: schema,
                    code: source,
                    declare: declare,
                    compile: cacheCompile
                });
            }
        }

        source('return ok');

        return source.compile(context);
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