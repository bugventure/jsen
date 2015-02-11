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

    return src;
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

    return clauses.join(' || ');
};

keywords.minimum = function (schema) {
    if (type.isNumber(schema.minimum)) {
        return '!(' + types.number() + ') || d >= ' + schema.minimum;
    }

    return;
};

keywords.exclusiveMinimum = function (schema) {
    if (schema.exclusiveMinimum === true && type.isNumber(schema.minimum)) {
        return 'd !== ' + schema.minimum;
    }

    return;
};

keywords.maximum = function (schema) {
    if (type.isNumber(schema.maximum)) {
        return '!(' + types.number() + ') || d <= ' + schema.maximum;
    }

    return;
};

keywords.exclusiveMaximum = function (schema) {
    if (schema.exclusiveMaximum === true && type.isNumber(schema.maximum)) {
        return 'd !== ' + schema.maximum;
    }

    return;
};

keywords.multipleOf = function (schema) {
    if (type.isNumber(schema.multipleOf)) {
        var mul = schema.multipleOf,
            decimals = mul.toString().length - mul.toFixed(0).length - 1,
            pow = decimals > 0 ? Math.pow(10, decimals) : 1;

        return '!(' + types.number() + ') || ((d * ' + pow + ') % ' + (mul * pow) + ') === 0';
    }

    return;
};

keywords.minLength = function (schema) {
    if (type.isInteger(schema.minLength)) {
        return '!(' + types.string() + ') || d.length >= ' + schema.minLength;
    }

    return;
};

keywords.maxLength = function (schema) {
    if (type.isInteger(schema.maxLength)) {
        return '!(' + types.string() + ') || d.length <= ' + schema.maxLength;
    }

    return;
};

keywords.pattern = function (schema) {
    var regex = type.isString(schema.pattern) ?
        new RegExp(schema.pattern) :
        schema.pattern;

    if (type.isRegExp(regex)) {
        return '!(' + types.string() + ') || (' + regex.toString() + ').test(d)';
    }

    return;
};

keywords.format = function (schema) {
    if (!type.isString(schema.format) || !formats[schema.format]) {
        return;
    }

    return '!(' + types.string() + ') || (' + formats[schema.format].toString() + ').test(d)';
};

keywords.minItems = function (schema) {
    if (type.isInteger(schema.minItems)) {
        return '!(' + types.array() + ') || d.length >= ' + schema.minItems;
    }

    return;
};

keywords.maxItems = function (schema) {
    if (type.isInteger(schema.maxItems)) {
        return '!(' + types.array() + ') || d.length <= ' + schema.maxItems;
    }

    return;
};

keywords.uniqueItems = function (schema) {
    if (schema.uniqueItems) {
        return '!(' + types.array() + ') || u(d).length === d.length';
    }

    return;
};

keywords.items = function (schema, compile, cache) {
    var fu;

    if (type.isObject(schema.items)) {
        fu = func('d')
            ('var v = %s', compile(schema.items))
            ('for (var i = 0; i < d.length; i++) {')
                ('if (!v(d[i])) {')
                    ('return false')
                ('}')
            ('}')
            ('return true');
    }
    else if (type.isArray(schema.items)) {
        fu = func('d')
            ('var v')
            ('var s = []');       // item validators

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
                ('return false')
              ('}')
          ('}')
          ('return true');
    }

    return fu ? '!(' + types.array() + ') || ' + cache(fu) + '(d)' : undefined;
};

keywords.additionalItems = function (schema) {
    if (schema.additionalItems === false && type.isArray(schema.items)) {
        return '!(' + types.array() + ') || d.length <= ' + schema.items.length;
    }

    return;
};

keywords.maxProperties = function (schema) {
    if (type.isInteger(schema.maxProperties)) {
        return '!(' + types.object() + ') || Object.keys(d).length <= ' + schema.maxProperties;
    }

    return;
};

keywords.minProperties = function (schema) {
    if (type.isInteger(schema.minProperties)) {
        return '!(' + types.object() + ') || Object.keys(d).length >= ' + schema.minProperties;
    }

    return;
};

keywords.required = function (schema, compile, cache) {
    if (!type.isArray(schema.required)) {
        return;
    }

    var fu = func('d', 'r')
        ('for (var i = 0; i < r.length; i++) {')
            ('if (d[r[i]] === undefined) {')
                ('return false')
            ('}')
        ('}')
        ('return true');

    return '!(' + types.object() + ') || ' + cache(fu) + '(d, ' + JSON.stringify(schema.required) + ')';
};

keywords.properties = function (schema, compile, cache) {
    var props = schema.properties,
        fu;

    if (!type.isObject(props)) {
        return;
    }

    fu = func('d')('var p = {}, k');

    Object.keys(props).forEach(function forEachProp(prop) {
        fu('p["%s"] = %s', prop, compile(props[prop]));
    });

    fu('for(k in p) {')
        ('var v = d[k]')
        ('if (v !== undefined && !p[k](v)) {')
            ('return false')
        ('}')
    ('}')
    ('return true');

    return '!(' + types.object() + ') || ' + cache(fu) + '(d)';
};

keywords.patternProperties = function (schema, compile, cache) {
    var patProps = schema.patternProperties,
        patterns = type.isObject(patProps) ?
            Object.keys(patProps) : [],
        fu;

    if (!patterns.length) {
        return;
    }

    fu = func('d')
        ('var p = {}')
        ('var k = Object.keys(d)')
        ('var i, j, y');

    patterns.forEach(function forEachPattern(pattern) {
        var validator = compile(patProps[pattern]);
        fu('p["%s"] = %s', pattern, validator);
    });

    fu('for (t in p) {')
        ('var x = new RegExp(t)')
        ('for (var j = 0; j < k.length; j++) {')
            ('y = k[j]')
            ('if (x.test(y) && !p[t](d[y])) {')
                ('return false')
            ('}')
        ('}')
    ('}')
    ('return true');

    return '!(' + types.object() + ') || ' + cache(fu) + '(d)';
};

keywords.additionalProperties = function (schema, compile, cache) {
    if (schema.additionalProperties === undefined ||
        schema.additionalProperties === true) {
        return;
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

    fu = func('d', 'p', 'a')
        ('var y, k = Object.keys(d)');

    if (validator) {
        fu('var v = %s', validator);
    }

    fu('for (var i = 0; i < k.length; i++) {')
        ('y = k[i]')
        ('if (p.indexOf(y) > -1) {')
            ('continue')
        ('}')
        ('var f = false')
        ('for (j = 0; j < a.length; j++) {')
            ('if (new RegExp(a[j]).test(y)) {')
                ('f = true')
                ('break')
            ('}')
        ('}')
        ('if (!f) {');

    if (forbidden) {
        fu('return false');
    }
    else {
        fu('if (!v(d[y])) {')
            ('return false')
        ('}');
    }

    fu('}')
    ('}')
    ('return true');

    return '!(' + types.object() + ') || ' + cache(fu) + '(d, ' + args.join(', ') + ')';
};

keywords.dependencies = function (schema, compile, cache) {
    if (!type.isObject(schema.dependencies)) {
        return;
    }

    var fu = func('d');

    Object.keys(schema.dependencies).forEach(function forEach(key) {
        var dep = schema.dependencies[key],
            validator;

        fu('if (d["%s"] !== undefined) {', key);

        if (type.isObject(dep)) {
            //schema dependency
            validator = compile(dep);

            fu('var v = %s', validator)
              ('if (!v(d)) {')
                ('return false')
              ('}');
        }
        else {
            // property dependency
            dep.forEach(function forEachProp(prop) {
                fu('if (d["%s"] === undefined) {', prop)
                    ('return false')
                  ('}');
            });
        }

        fu('}');
    });

    fu('return true');

    return '!(' + types.object() + ') || ' + cache(fu) + '(d)';
};

keywords.allOf = function (schema, compile, cache) {
    if (!type.isArray(schema.allOf)) {
        return;
    }

    var fu = func('d')('var v = [], i');

    schema.allOf.forEach(function forEachSchema(childSchema) {
        fu('v.push(%s)', compile(childSchema));
    });

    fu('for (i = 0; i < v.length; i++) {')
        ('if (!v[i](d)) {')
            ('return false')
        ('}')
      ('}')
      ('return true');

    return cache(fu) + '(d)';
};

keywords.anyOf = function (schema, compile, cache) {
    if (!type.isArray(schema.anyOf)) {
        return;
    }

    var fu = func('d')('var v = [], i');

    schema.anyOf.forEach(function forEachSchema(childSchema) {
        fu('v.push(%s)', compile(childSchema));
    });

    fu('for (i = 0; i < v.length; i++) {')
        ('if (v[i](d)) {')
            ('return true')
        ('}')
      ('}')
      ('return false');

    return cache(fu) + '(d)';
};

keywords.oneOf = function (schema, compile, cache) {
    if (!type.isArray(schema.oneOf)) {
        return;
    }

    var fu = func('d')('var v = [], m = 0, i');

    schema.oneOf.forEach(function forEachSchema(childSchema) {
        fu('v.push(%s)', compile(childSchema));
    });

    fu('for (i = 0; i < v.length; i++) {')
        ('if (v[i](d)) {')
            ('m++')
            ('if (m > 1) {')
                ('return false')
            ('}')
        ('}')
      ('}')
      ('return m === 1');

    return cache(fu) + '(d)';
};

keywords.not = function (schema, compile) {
    if (!type.isObject(schema.not)) {
        return;
    }

    return '!' + compile(schema.not) + '(d)';
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

        fu = func('d')
            ('var t = typeof d')
            ('t = t === "object" ? (!d ? "null" : (Array.isArray(d) ? "array" : t)) : t');

        for (i = 0; i < keys.length; i++) {
            kw = keys[i];
            src = (keywords[kw] || noop)(schema, cacheCompile, cache);

            if (src) {
                fu('if (!(%s)) return false', src);
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