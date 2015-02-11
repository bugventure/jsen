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
    return 'd === null';
};

types.boolean = function () {
    return 't === "boolean"';
};

types.string = function () {
    return 't === "string"';
};

types.number = function () {
    return 't === "number"';
};

types.integer = function () {
    return 't === "number" && !(d % 1)';
};

types.array = function () {
    return 't === "array"';
};

types.object = function () {
    return 't === "object"';
};

keywords.type = function (schema) {
    var specified = type.isArray(schema.type) ?
        schema.type :
        [schema.type],
        src =  specified.map(function mapType(type) {
            return (types[type] || noop)();
        }).join(' || ');

    return src ? 'ok = ' + src : undefined;
};

keywords.enum = function (schema) {
    var arr = schema.enum,
        clauses = [],
        i;

    if (!type.isArray(arr)) {
        return;
    }

    for (i = 0; i < arr.length; i++) {
        clauses.push('e(d, ' + JSON.stringify(arr[i]) + ')');
    }

    return 'ok = ' + clauses.join(' || ');
};

keywords.minimum = function (schema) {
    if (type.isNumber(schema.minimum)) {
        return 'ok = !(' + types.number() + ') || d >= ' + schema.minimum;
    }

    return;
};

keywords.exclusiveMinimum = function (schema) {
    if (schema.exclusiveMinimum === true && type.isNumber(schema.minimum)) {
        return 'ok = d !== ' + schema.minimum;
    }

    return;
};

keywords.maximum = function (schema) {
    if (type.isNumber(schema.maximum)) {
        return 'ok = !(' + types.number() + ') || d <= ' + schema.maximum;
    }

    return;
};

keywords.exclusiveMaximum = function (schema) {
    if (schema.exclusiveMaximum === true && type.isNumber(schema.maximum)) {
        return 'ok = d !== ' + schema.maximum;
    }

    return;
};

keywords.multipleOf = function (schema) {
    if (type.isNumber(schema.multipleOf)) {
        var mul = schema.multipleOf,
            decimals = mul.toString().length - mul.toFixed(0).length - 1,
            pow = decimals > 0 ? Math.pow(10, decimals) : 1;

        return 'ok = !(' + types.number() + ') || ((d * ' + pow + ') % ' + (mul * pow) + ') === 0';
    }

    return;
};

keywords.minLength = function (schema) {
    if (type.isInteger(schema.minLength)) {
        return 'ok = !(' + types.string() + ') || d.length >= ' + schema.minLength;
    }

    return;
};

keywords.maxLength = function (schema) {
    if (type.isInteger(schema.maxLength)) {
        return 'ok = !(' + types.string() + ') || d.length <= ' + schema.maxLength;
    }

    return;
};

keywords.pattern = function (schema) {
    var regex = type.isString(schema.pattern) ?
        new RegExp(schema.pattern) :
        schema.pattern;

    if (type.isRegExp(regex)) {
        return 'ok = !(' + types.string() + ') || (' + regex.toString() + ').test(d)';
    }

    return;
};

keywords.format = function (schema) {
    if (!type.isString(schema.format) || !formats[schema.format]) {
        return;
    }

    return 'ok = !(' + types.string() + ') || (' + formats[schema.format].toString() + ').test(d)';
};

keywords.minItems = function (schema) {
    if (type.isInteger(schema.minItems)) {
        return 'ok = !(' + types.array() + ') || d.length >= ' + schema.minItems;
    }

    return;
};

keywords.maxItems = function (schema) {
    if (type.isInteger(schema.maxItems)) {
        return 'ok = !(' + types.array() + ') || d.length <= ' + schema.maxItems;
    }

    return;
};

keywords.uniqueItems = function (schema) {
    if (schema.uniqueItems) {
        return 'ok = !(' + types.array() + ') || u(d).length === d.length';
    }

    return;
};

keywords.items = function (schema, compile) {
    var fu = func();

    fu('if (%s) {', types.array());

    if (type.isObject(schema.items)) {
        fu('for (var i = 0; i < d.length; i++) {')
            ('if (!%s(d[i])) {', compile(schema.items))
                ('ok = false')
                ('break')
            ('}')
          ('}');
    }
    else if (type.isArray(schema.items)) {
        fu('var v, s = []');

        if (type.isObject(schema.additionalItems)) {
            // additional item validator
            fu('var a = %s', compile(schema.additionalItems));
        }
        else {
            fu('var a = null');
        }

        schema.items.forEach(function forEachSchema(itemSchema, index) {
            if (type.isObject(itemSchema)) {
                fu('s[%d] = %s', index, compile(itemSchema));
            }
        });

        fu('for (var i = 0; i < d.length; i++) {')
            ('v = s[i] || a')
            ('if (v && !v(d[i])) {')
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
        return 'ok = !(' + types.array() + ') || d.length <= ' + schema.items.length;
    }

    return;
};

keywords.maxProperties = function (schema) {
    if (type.isInteger(schema.maxProperties)) {
        return 'ok = !(' + types.object() + ') || Object.keys(d).length <= ' + schema.maxProperties;
    }

    return;
};

keywords.minProperties = function (schema) {
    if (type.isInteger(schema.minProperties)) {
        return 'ok = !(' + types.object() + ') || Object.keys(d).length >= ' + schema.minProperties;
    }

    return;
};

keywords.required = function (schema) {
    if (!type.isArray(schema.required)) {
        return;
    }

    var fu = func()
        ('if (%s) {', types.object())
            ('var q = %s', JSON.stringify(schema.required))
            ('for (var i = 0; i < q.length; i++) {')
                ('if (d[q[i]] === undefined) {')
                    ('ok = false')
                    ('break')
                ('}')
            ('}')
        ('}');

    return fu.lines();
};

keywords.properties = function (schema, compile) {
    var props = schema.properties,
        fu;

    if (!type.isObject(props)) {
        return;
    }

    fu = func()
        ('if (%s) {', types.object())
            ('var y, v, p = {}');

    Object.keys(props).forEach(function forEachProp(prop) {
        fu('p["%s"] = %s', prop, compile(props[prop]));
    });

    fu('for(y in p) {')
        ('v = d[y]')
        ('if (v !== undefined && !p[y](v)) {')
            ('ok = false')
            ('break')
        ('}')
    ('}')

    ('}');

    return fu.lines();
};

keywords.patternProperties = function (schema, compile) {
    var patProps = schema.patternProperties,
        patterns = type.isObject(patProps) ?
            Object.keys(patProps) : [],
        fu;

    if (!patterns.length) {
        return;
    }

    fu = func()
        ('if (%s) {', types.object())
            ('var p = {}, i, j, n, x, y');

    patterns.forEach(function forEachPattern(pattern) {
        var validator = compile(patProps[pattern]);
        fu('p["%s"] = %s', pattern, validator);
    });

    fu('brkpt:')    // break point
      ('for (n in p) {')
        ('x = new RegExp(n)')
        ('for (var j = 0; j < k.length; j++) {')
            ('y = k[j]')
            ('if (x.test(y) && !p[n](d[y])) {')
                ('ok = false')
                ('break brkpt')
            ('}')
        ('}')
    ('}')

    ('}');

    return fu.lines();
};

keywords.additionalProperties = function (schema, compile) {
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
        fu;

    fu = func()
        ('if (%s) {', types.object())
            ('var y, f, p = %s', JSON.stringify(propKeys))
            ('var a = %s', JSON.stringify(patternRegexes));

    if (validator) {
        fu('var v = %s', validator);
    }

    fu('for (var i = 0; i < k.length; i++) {')
        ('y = k[i]')

        ('if (p.indexOf(y) > -1) {')
            ('continue')
        ('}')

        ('f = false')

        ('for (j = 0; j < a.length; j++) {')
            ('if (new RegExp(a[j]).test(y)) {')
                ('f = true')
                ('break')
            ('}')
        ('}')

        ('if (!f) {');

    if (forbidden) {
        fu('ok = false')
          ('break');
    }
    else {
        fu('if (!v(d[y])) {')
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
        ('if (%s) {', types.object());

    Object.keys(schema.dependencies).forEach(function forEach(key) {
        var dep = schema.dependencies[key],
            validator;

        fu('if (d["%s"] !== undefined) {', key);

        if (type.isObject(dep)) {
            //schema dependency
            validator = compile(dep);

            fu('if (!%s(d)) {', validator)
                ('ok = false')
              ('}');
        }
        else {
            // property dependency
            dep.forEach(function forEachProp(prop) {
                fu('if (d["%s"] === undefined) {', prop)
                    ('ok = false')
                  ('}');
            });
        }

        fu('}');
    });

    fu('}');

    return fu.lines();
};

keywords.allOf = function (schema, compile) {
    if (!type.isArray(schema.allOf)) {
        return;
    }

    var fu = func()
        ('var v = [], i');

    schema.allOf.forEach(function forEachSchema(childSchema) {
        fu('v.push(%s)', compile(childSchema));
    });

    fu('for (i = 0; i < v.length; i++) {')
        ('if (!v[i](d)) {')
            ('ok = false')
            ('break')
        ('}')
      ('}');

    return fu.lines();
};

keywords.anyOf = function (schema, compile) {
    if (!type.isArray(schema.anyOf)) {
        return;
    }

    var fu = func()
        ('var v = [], i, f = false');

    schema.anyOf.forEach(function forEachSchema(childSchema) {
        fu('v.push(%s)', compile(childSchema));
    });

    fu('for (i = 0; i < v.length; i++) {')
        ('if (v[i](d)) {')
            ('f = true')
        ('}')
      ('}')

      ('if (!f) {')
        ('ok = false')
      ('}');

    return fu.lines();
};

keywords.oneOf = function (schema, compile) {
    if (!type.isArray(schema.oneOf)) {
        return;
    }

    var fu = func()('var v = [], m = 0, i');

    schema.oneOf.forEach(function forEachSchema(childSchema) {
        fu('v.push(%s)', compile(childSchema));
    });

    fu('for (i = 0; i < v.length; i++) {')
        ('if (v[i](d)) {')
            ('m++')
            ('if (m > 1) {')
                ('ok = false')
                ('break')
            ('}')
        ('}')
      ('}')
      ('return m === 1');

    return fu.lines();
};

keywords.not = function (schema, compile) {
    if (!type.isObject(schema.not)) {
        return;
    }

    return 'ok = !' + compile(schema.not) + '(d)';
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
            e: equal,
            u: unique,
            r: refs
        };

    function id() {
        return 'r' + (counter++);
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
            ref = schema.$ref;

        if (!ref) {
            return func.toString();
        }

        return 'r.' + funcache[ref].key;
    }

    function cache(builder) {
        var func = builder.compile(context),
            key = id();

        refs[key] = func;

        return 'r.' + key;
    }

    function compile(schema) {
        var fu, keys, kw, src, i;

        keys = Object.keys(schema);

        /*
            Reserved variables:
            d - data
            t - type
            k - keys
            e - equal
            u - unique
            r - refs
        */

        fu = func('d')
            ('var ok = true')       // valid by default
            ('var t = typeof d')    // type
            ('t = t === "object" ? (!d ? "null" : (Array.isArray(d) ? "array" : t)) : t')
            ('var k = t === "object" ? Object.keys(d) : []');   // Object.keys(data)

        for (i = 0; i < keys.length; i++) {
            kw = keys[i];
            src = (keywords[kw] || noop)(schema, cacheCompile, cache);

            if (src) {
                fu(src)
                  ('if (!ok) return false');
                //fu('if (!(%s)) return false', src);
            }
        }

        fu('return true');

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