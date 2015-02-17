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

keywords.type = function (schema, code) {
    var specified = Array.isArray(schema.type) ? schema.type : [schema.type],
        src =  specified.map(function mapType(type) {
            return types[type] || 'true';
        }).join(' || ');

    if (src) {
        code('ok = ok && (' + src + ')');
    }
};

keywords.enum = function (schema, code) {
    var arr = schema.enum,
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

    code('ok = ok && (' + clauses.join(' || ') + ')');
};

keywords.minimum = function (schema, code) {
    if (typeof schema.minimum === 'number') {
        code('ok = ok && (!(' + types.number + ') || data >= ' + schema.minimum + ')');
    }
};

keywords.exclusiveMinimum = function (schema, code) {
    if (schema.exclusiveMinimum === true && typeof schema.minimum === 'number') {
        code('ok = ok && data !== ' + schema.minimum);
    }
};

keywords.maximum = function (schema, code) {
    if (typeof schema.maximum === 'number') {
        code('ok = ok && (!(' + types.number + ') || data <= ' + schema.maximum + ')');
    }
};

keywords.exclusiveMaximum = function (schema, code) {
    if (schema.exclusiveMaximum === true && typeof schema.maximum === 'number') {
        code('ok = ok && data !== ' + schema.maximum);
    }
};

keywords.multipleOf = function (schema, code) {
    if (typeof schema.multipleOf === 'number') {
        var mul = schema.multipleOf,
            decimals = mul.toString().length - mul.toFixed(0).length - 1,
            pow = decimals > 0 ? Math.pow(10, decimals) : 1;

        code('ok = ok && (!(' + types.number + ') || ((data * ' + pow + ') % ' + (mul * pow) + ') === 0)');
    }
};

keywords.minLength = function (schema, code) {
    if (type.isInteger(schema.minLength)) {    // jshint ignore: line
        code('ok = ok && (!(' + types.string + ') || data.length >= ' + schema.minLength + ')');
    }
};

keywords.maxLength = function (schema, code) {
    if (type.isInteger(schema.maxLength)) {    // jshint ignore: line
        code('ok = ok && (!(' + types.string + ') || data.length <= ' + schema.maxLength + ')');
    }
};

keywords.pattern = function (schema, code) {
    var regex = typeof schema.pattern === 'string' ?
        new RegExp(schema.pattern) :
        schema.pattern;

    if (type.isRegExp(regex)) {
        code('ok = ok && (!(' + types.string + ') || (' + regex.toString() + ').test(data))');
    }
};

keywords.format = function (schema, code) {
    if (typeof schema.format !== 'string' || !formats[schema.format]) {
        return;
    }

    code('ok = ok && (!(' + types.string + ') || (' + formats[schema.format].toString() + ').test(data))');
};

keywords.minItems = function (schema, code) {
    if (type.isInteger(schema.minItems)) {
        code('ok = ok && (!(' + types.array + ') || data.length >= ' + schema.minItems + ')');
    }
};

keywords.maxItems = function (schema, code) {
    if (type.isInteger(schema.maxItems)) {
        code('ok = ok && (!(' + types.array + ') || data.length <= ' + schema.maxItems + ')');
    }
};

keywords.uniqueItems = function (schema, code) {
    if (schema.uniqueItems) {
        code('ok = ok && (!(' + types.array + ') || unique(data).length === data.length)');
    }
};

keywords.items = function (schema, code, declare, compile) {
    var i = declare(0),
        validator,
        schemas,
        aiv;

    code('if (ok && %s) {', types.array);

    if (type.isObject(schema.items)) {
        code('for (%s; %s < data.length; %s++) {', i, i, i)
            ('if (!%s(data[%s])) {', compile(schema.items), i)
                ('ok = false')
                ('break')
            ('}')
          ('}');
    }
    else if (Array.isArray(schema.items)) {
        validator = declare();

        if (type.isObject(schema.additionalItems)) {
            // additional item validator
            aiv = declare(compile(schema.additionalItems));
        }
        else {
            aiv = declare('null');
        }

        schemas = declare('[%s]', schema.items.map(function mapSchema(itemSchema) {
            return compile(itemSchema);
        }).join(', '));

        code('for (%s; %s < data.length; %s++) {', i, i, i)
            ('%s = %s[%s] || %s', validator, schemas, i, aiv)
            ('if (%s && !%s(data[%s])) {', validator, validator, i)
                ('ok = false')
                ('break')
            ('}')
        ('}');
    }

    code('}');
};

keywords.additionalItems = function (schema, code) {
    if (schema.additionalItems === false && Array.isArray(schema.items)) {
        code('ok = ok && !(' + types.array + ') || data.length <= ' + schema.items.length);
    }
};

keywords.maxProperties = function (schema, code) {
    if (type.isInteger(schema.maxProperties)) {
        code('ok = ok && !(' + types.object + ') || keys.length <= ' + schema.maxProperties);
    }
};

keywords.minProperties = function (schema, code) {
    if (type.isInteger(schema.minProperties)) {
        code('ok = ok && !(' + types.object + ') || keys.length >= ' + schema.minProperties);
    }
};

keywords.required = function (schema, code) {
    if (!Array.isArray(schema.required)) {
        return;
    }

    code('if (ok && %s) {', types.object);

    for (var i = 0; i < schema.required.length; i++) {
        code('ok = ok && data.%s !== undefined', schema.required[i]);
    }

    code('}');
};

keywords.properties = function (schema, code, declare, compile) {
    var props = schema.properties,
        propvalidators, key, value;

    if (!type.isObject(props)) {
        return;
    }

    key = declare('""');
    value = declare('null');

    propvalidators = declare('{ ' + Object.keys(props).map(function mapProp(prop) {
        return prop + ': ' + compile(props[prop]);
    }).join(', ') + ' }');

    code('if (ok && %s) {', types.object)
        ('for(%s in %s) {', key, propvalidators)
            ('%s = data[%s]', value, key)
            ('if (%s !== undefined && !%s[%s](%s)) {', value, propvalidators, key, value)
                ('ok = false')
                ('break')
            ('}')
        ('}')
    ('}');
};

keywords.patternProperties = function (schema, code, declare, compile) {
    var patProps = schema.patternProperties,
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

    pattern = declare('""');
    regex = declare();
    key = declare('""');
    i = declare(0);

    patternValidators = declare('{ ' + patterns.map(function mapPattern(pattern) {
        return '"' + pattern + '": ' + compile(patProps[pattern]);
    }).join(', ') + ' }');

    code('if (ok && %s) {', types.object)
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

keywords.additionalProperties = function (schema, code, declare, compile) {
    if (schema.additionalProperties === undefined ||
        schema.additionalProperties === true) {
        return;
    }

    var propKeys = type.isObject(schema.properties) ?
            Object.keys(schema.properties) : [],
        patternRegexes = type.isObject(schema.patternProperties) ?
            Object.keys(schema.patternProperties) : [],
        forbidden = schema.additionalProperties === false,
        validator = forbidden ?
            null :
            compile(schema.additionalProperties),
        properties, key, found, regexes, i, j, val;

    properties = declare(JSON.stringify(propKeys));
    key = declare('""');
    found = declare('false');
    regexes = declare(JSON.stringify(patternRegexes));
    i = declare(0);
    j = declare(0);

    if (validator) {
        val = declare(validator);
    }

    code('if (ok && %s) {', types.object)
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
        code('ok = false')
          ('break');
    }
    else {
        code('if (!%s(data[%s])) {', val, key)
            ('ok = false')
            ('break')
        ('}');
    }

    code('}')

    ('}')

    ('}');
};

keywords.dependencies = function (schema, code, declare, compile) {
    if (!type.isObject(schema.dependencies)) {
        return;
    }

    code('if (ok && %s) {', types.object);

    Object.keys(schema.dependencies).forEach(function forEach(key) {
        var dep = schema.dependencies[key],
            validator;

        code('if (data["%s"] !== undefined) {', key);

        if (type.isObject(dep)) {
            //schema dependency
            validator = compile(dep);

            code('if (!%s(data)) {', validator)
                ('ok = false')
              ('}');
        }
        else {
            // property dependency
            dep.forEach(function forEachProp(prop) {
                code('if (data["%s"] === undefined) {', prop)
                    ('ok = false')
                  ('}');
            });
        }

        code('}');
    });

    code('}');
};

keywords.allOf = function (schema, code, declare, compile) {
    if (!Array.isArray(schema.allOf)) {
        return;
    }

    var i = declare(0),
        validators = declare('[' + schema.allOf.map(function mapSchema(childSchema) {
            return compile(childSchema);
        }).join(', ') + ']');

    code('if (ok) {')
        ('for (%s; %s < %s.length; %s++) {', i, i, validators, i)
            ('if (!%s[%s](data)) {', validators, i)
                ('ok = false')
                ('break')
            ('}')
        ('}')
    ('}');
};

keywords.anyOf = function (schema, code, declare, compile) {
    if (!Array.isArray(schema.anyOf)) {
        return;
    }

    var i = declare(0),
        found = declare('false'),
        validators = declare('[' + schema.anyOf.map(function mapSchema(childSchema) {
            return compile(childSchema);
        }).join(', ') + ']');

    code('if (ok) {')
        ('for (%s; %s < %s.length; %s++) {', i, i, validators, i)
            ('if (%s[%s](data)) {', validators, i)
                ('%s = true', found)
                ('break')
            ('}')
        ('}')

        ('ok = ok && %s', found)
    ('}');
};

keywords.oneOf = function (schema, code, declare, compile) {
    if (!Array.isArray(schema.oneOf)) {
        return;
    }

    var i = declare(0),
        matching = declare(0),
        validators = declare('[' + schema.oneOf.map(function mapSchema(childSchema) {
            return compile(childSchema);
        }).join(', ') + ']');

    code('if (ok) {')
        ('for (%s = 0; %s < %s.length; %s++) {', i, i, validators, i)
            ('if (%s[%s](data)) {', validators, i)
                ('%s++', matching)
                ('if (%s > 1) {', matching)
                    ('ok = false')
                    ('break')
                ('}')
            ('}')
        ('}')
      ('ok = ok && %s === 1', matching)
    ('}');
};

keywords.not = function (schema, code, declare, compile) {
    if (type.isObject(schema.not)) {
        code('ok = !' + compile(schema.not) + '(data)');
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

function toBase26(num) {
    var start = 'a'.charCodeAt(0),
        rem = 0,
        str = num ? '' : 'a';

    while (num > 0) {
        rem = num % 26;
        str = String.fromCharCode(start + rem) + str;
        num = Math.floor((num - rem) / 26);
    }

    return str;
}

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
        // adding the last char at the end will make sure we don't accidentally take a reserved word
        return toBase26(counter++).split('').reverse().join('') + '_';
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
                generator(schema, source, declare, cacheCompile);
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