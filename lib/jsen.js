'use strict';
var func = require('./func.js'),
    type = require('./type.js'),
    equal = require('./equal.js'),
    unique = require('./unique.js'),
    strings = require('./strings.js'),
    SchemaResolver = require('./resolver.js'),
    types = {},
    keywords = {},
    formats = {},
    noop = function () { };

types.null = function () {
    return 'data === null';
};

types.boolean = function () {
    return 'type === "boolean"';
};

types.string = function () {
    return 'type === "string"';
};

types.number = function () {
    return 'type === "number"';
};

types.integer = function () {
    return 'type === "number" && !(data % 1)';
};

types.array = function () {
    return 'type === "array"';
};

types.object = function () {
    return 'type === "object"';
};

keywords.type = function (schema) {
    var specified = type.isArray(schema.type) ?
        schema.type :
        [schema.type],
        src =  specified.map(function mapType(type) {
            return (types[type] || noop)();
        }).join(' || ');

    return src ? 'ok = ok && (' + src + ')' : undefined;
};

keywords.enum = function (schema) {
    var arr = schema.enum,
        clauses = [],
        i;

    if (!type.isArray(arr)) {
        return;
    }

    for (i = 0; i < arr.length; i++) {
        clauses.push('equal(data, ' + JSON.stringify(arr[i]) + ')');
    }

    return 'ok = ok && (' + clauses.join(' || ') + ')';
};

keywords.minimum = function (schema) {
    if (type.isNumber(schema.minimum)) {
        return 'ok = ok && (!(' + types.number() + ') || data >= ' + schema.minimum + ')';
    }

    return;
};

keywords.exclusiveMinimum = function (schema) {
    if (schema.exclusiveMinimum === true && type.isNumber(schema.minimum)) {
        return 'ok = ok && data !== ' + schema.minimum;
    }

    return;
};

keywords.maximum = function (schema) {
    if (type.isNumber(schema.maximum)) {
        return 'ok = ok && (!(' + types.number() + ') || data <= ' + schema.maximum + ')';
    }

    return;
};

keywords.exclusiveMaximum = function (schema) {
    if (schema.exclusiveMaximum === true && type.isNumber(schema.maximum)) {
        return 'ok = ok && data !== ' + schema.maximum;
    }

    return;
};

keywords.multipleOf = function (schema) {
    if (type.isNumber(schema.multipleOf)) {
        var mul = schema.multipleOf,
            decimals = mul.toString().length - mul.toFixed(0).length - 1,
            pow = decimals > 0 ? Math.pow(10, decimals) : 1;

        return 'ok = ok && (!(' + types.number() + ') || ((data * ' + pow + ') % ' + (mul * pow) + ') === 0)';
    }

    return;
};

keywords.minLength = function (schema) {
    if (type.isInteger(schema.minLength)) {
        return 'ok = ok && (!(' + types.string() + ') || data.length >= ' + schema.minLength + ')';
    }

    return;
};

keywords.maxLength = function (schema) {
    if (type.isInteger(schema.maxLength)) {
        return 'ok = ok && (!(' + types.string() + ') || data.length <= ' + schema.maxLength + ')';
    }

    return;
};

keywords.pattern = function (schema) {
    var regex = type.isString(schema.pattern) ?
        new RegExp(schema.pattern) :
        schema.pattern;

    if (type.isRegExp(regex)) {
        return 'ok = ok && (!(' + types.string() + ') || (' + regex.toString() + ').test(data))';
    }

    return;
};

keywords.format = function (schema) {
    if (!type.isString(schema.format) || !formats[schema.format]) {
        return;
    }

    return 'ok = ok && (!(' + types.string() + ') || (' + formats[schema.format].toString() + ').test(data))';
};

keywords.minItems = function (schema) {
    if (type.isInteger(schema.minItems)) {
        return 'ok = ok && (!(' + types.array() + ') || data.length >= ' + schema.minItems + ')';
    }

    return;
};

keywords.maxItems = function (schema) {
    if (type.isInteger(schema.maxItems)) {
        return 'ok = ok && (!(' + types.array() + ') || data.length <= ' + schema.maxItems + ')';
    }

    return;
};

keywords.uniqueItems = function (schema) {
    if (schema.uniqueItems) {
        return 'ok = ok && (!(' + types.array() + ') || unique(data).length === data.length)';
    }

    return;
};

keywords.items = function (schema, compile, declare) {
    var fu = func(),
        validator,
        schemas,
        aiv,
        i;

    fu.def(i, 0)
        ('if (ok && %s) {', types.array());

    if (type.isObject(schema.items)) {
        fu('for (%s; %s < data.length; %s++) {', i, i, i)
            ('if (!%s(data[%s])) {', compile(schema.items), i)
                ('ok = false')
                ('break')
            ('}')
          ('}');
    }
    else if (type.isArray(schema.items)) {
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

        fu('for (%s; %s < data.length; %s++) {', i, i, i)
            ('%s = %s[%s] || %s', validator, schemas, i, aiv)
            ('if (%s && !%s(data[%s])) {', validator, validator, i)
                ('ok = false')
                ('break')
            ('}')
        ('}');
    }

    fu('}');

    return fu.lines();
};

keywords.additionalItems = function (schema) {
    if (schema.additionalItems === false && type.isArray(schema.items)) {
        return 'ok = ok && !(' + types.array() + ') || data.length <= ' + schema.items.length;
    }

    return;
};

keywords.maxProperties = function (schema) {
    if (type.isInteger(schema.maxProperties)) {
        return 'ok = ok && !(' + types.object() + ') || keys.length <= ' + schema.maxProperties;
    }

    return;
};

keywords.minProperties = function (schema) {
    if (type.isInteger(schema.minProperties)) {
        return 'ok = ok && !(' + types.object() + ') || keys.length >= ' + schema.minProperties;
    }

    return;
};

keywords.required = function (schema, compile, declare) {
    if (!type.isArray(schema.required)) {
        return;
    }

    var fu = func(), required, i;

    i = declare(0);
    required = declare(JSON.stringify(schema.required));

    fu('if (ok && %s) {', types.object())
        ('for (%s; %s < %s.length; %s++) {', i, i, required, i)
            ('if (data[%s[%s]] === undefined) {', required, i)
                ('ok = false')
                ('break')
            ('}')
        ('}')
    ('}');

    return fu.lines();
};

keywords.properties = function (schema, compile, declare) {
    var props = schema.properties,
        propvalidators, key, value, fu;

    if (!type.isObject(props)) {
        return;
    }

    key = declare('""');
    value = declare('null');

    propvalidators = declare('{ ' + Object.keys(props).map(function mapProp(prop) {
        return prop + ': ' + compile(props[prop]);
    }).join(', ') + ' }');

    fu = func()
        ('if (ok && %s) {', types.object());

    fu('for(%s in %s) {', key, propvalidators)
        ('%s = data[%s]', value, key)
        ('if (%s !== undefined && !%s[%s](%s)) {', value, propvalidators, key, value)
            ('ok = false')
            ('break')
        ('}')
    ('}')

    ('}');

    return fu.lines();
};

keywords.patternProperties = function (schema, compile, declare) {
    var patProps = schema.patternProperties,
        patterns = type.isObject(patProps) ?
            Object.keys(patProps) : [],
        pattern,
        patternValidators,
        regex,
        key,
        i,
        fu;

    if (!patterns.length) {
        return;
    }

    pattern = declare('""');
    regex = declare('//');
    key = declare('""');
    i = declare(0);

    patternValidators = declare('{ ' + patterns.map(function mapPattern(pattern) {
        return '"' + pattern + '": ' + compile(patProps[pattern]);
    }).join(', ') + ' }');

    fu = func()
        ('if (ok && %s) {', types.object());

    fu('brkpt:')    // break point
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

    return fu.lines();
};

keywords.additionalProperties = function (schema, compile, declare) {
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
        properties, key, found, regexes, i, j, val, fu;

    properties = declare(JSON.stringify(propKeys));
    key = declare('""');
    found = declare('false');
    regexes = declare(JSON.stringify(patternRegexes));
    i = declare(0);
    j = declare(0);

    if (validator) {
        val = declare(validator);
    }

    fu = func()
        ('if (ok && %s) {', types.object());

    fu('for (%s; %s < keys.length; %s++) {', i, i, i)
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
        fu('ok = false')
          ('break');
    }
    else {
        fu('if (!%s(data[%s])) {', val, key)
            ('ok = false')
            ('break')
        ('}');
    }

    fu('}')

    ('}')

    ('}');

    return fu.lines();
};

keywords.dependencies = function (schema, compile) {
    if (!type.isObject(schema.dependencies)) {
        return;
    }

    var fu = func()
        ('if (ok && %s) {', types.object());

    Object.keys(schema.dependencies).forEach(function forEach(key) {
        var dep = schema.dependencies[key],
            validator;

        fu('if (data["%s"] !== undefined) {', key);

        if (type.isObject(dep)) {
            //schema dependency
            validator = compile(dep);

            fu('if (!%s(data)) {', validator)
                ('ok = false')
              ('}');
        }
        else {
            // property dependency
            dep.forEach(function forEachProp(prop) {
                fu('if (data["%s"] === undefined) {', prop)
                    ('ok = false')
                  ('}');
            });
        }

        fu('}');
    });

    fu('}');

    return fu.lines();
};

keywords.allOf = function (schema, compile, declare) {
    if (!type.isArray(schema.allOf)) {
        return;
    }

    var fu = func(),
        i = declare(0),
        validators = declare('[' + schema.allOf.map(function mapSchema(childSchema) {
            return compile(childSchema);
        }).join(', ') + ']');

    fu('if (ok) {')
        ('for (%s; %s < %s.length; %s++) {', i, i, validators, i)
            ('if (!%s[%s](data)) {', validators, i)
                ('ok = false')
                ('break')
            ('}')
        ('}')
    ('}');

    return fu.lines();
};

keywords.anyOf = function (schema, compile, declare) {
    if (!type.isArray(schema.anyOf)) {
        return;
    }

    var fu = func(),
        i = declare(0),
        found = declare('false'),
        validators = declare('[' + schema.anyOf.map(function mapSchema(childSchema) {
            return compile(childSchema);
        }).join(', ') + ']');

    fu('if (ok) {')
        ('for (%s; %s < %s.length; %s++) {', i, i, validators, i)
            ('if (%s[%s](data)) {', validators, i)
                ('%s = true', found)
                ('break')
            ('}')
        ('}')

        ('ok = ok && %s', found)
    ('}');

    return fu.lines();
};

keywords.oneOf = function (schema, compile, declare) {
    if (!type.isArray(schema.oneOf)) {
        return;
    }

    var fu = func(),
        i = declare(0),
        matching = declare(0),
        validators = declare('[' + schema.oneOf.map(function mapSchema(childSchema) {
            return compile(childSchema);
        }).join(', ') + ']');

    fu('if (ok) {')
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

    return fu.lines();
};

keywords.not = function (schema, compile) {
    if (!type.isObject(schema.not)) {
        return;
    }

    return 'ok = !' + compile(schema.not) + '(data)';
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
        var func = resolve(schema, compile),
            ref = schema.$ref,
            key;

        if (ref) {
            return 'refs.' + funcache[ref].key;
        }

        key = id();

        refs[key] = func;

        return 'refs.' + key;
    }

    function compile(schema) {
        var fu, keys, kw, src, i;

        keys = Object.keys(schema);

        function declare() {
            var variname = id(),
                args = [].slice.call(arguments, 0);

            args.unshift(variname);

            fu.def.apply(fu, args);

            return variname;
        }

        fu = func('data')
            ('var ok = true')           // valid by default
            ('var type = typeof data')  // type
            ('type = type === "object" ? (!data ? "null" : (Array.isArray(data) ? "array" : type)) : type')
            ('var keys = type === "object" ? Object.keys(data) : []');

        for (i = 0; i < keys.length; i++) {
            kw = keys[i];
            src = (keywords[kw] || noop)(schema, cacheCompile, declare);

            if (src) {
                fu(src);
                  // ('if (!ok) return false');
            }
        }

        fu('return ok');

        return fu.compile(context);
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