'use strict';

var PATH_REPLACE_EXPR = /\[.+?\]/g,
    PATH_PROP_REPLACE_EXPR = /\[?(.*?)?\]/,
    REGEX_ESCAPE_EXPR = /[\/]/g,
    VALID_IDENTIFIER_EXPR = /^[a-z_$][0-9a-z]*$/gi,
    INVALID_SCHEMA = 'jsen: invalid schema object',
    browser = typeof window === 'object' && !!window.navigator,   // jshint ignore: line
    func = require('./func.js'),
    equal = require('./equal.js'),
    unique = require('./unique.js'),
    SchemaResolver = require('./resolver.js'),
    formats = require('./formats.js'),
    types = {},
    keywords = {};

function inlineRegex(regex) {
    var str = regex instanceof RegExp ? regex.toString() : new RegExp(regex).toString();

    if (browser) {
        return str;
    }

    str = str.substr(1, str.length - 2);
    str = '/' + str.replace(REGEX_ESCAPE_EXPR, '\\$&') + '/';

    return str;
}

function appendToPath(path, key) {
    VALID_IDENTIFIER_EXPR.lastIndex = 0;

    return VALID_IDENTIFIER_EXPR.test(key) ?
        path + '.' + key :
        path + '["' + key + '"]';
}

function type(obj) {
    var str = Object.prototype.toString.call(obj);
    return str.substr(8, str.length - 9).toLowerCase();
}

function isInteger(obj) {
    return (obj | 0) === obj;   // jshint ignore: line
}

types['null'] = function (path) {
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
    return path + ' !== undefined && Array.isArray(' + path + ')';
};

types.object = function (path) {
    return path + ' !== undefined && typeof ' + path + ' === "object" && ' + path + ' !== null && !Array.isArray(' + path + ')';
};

types.date = function (path) {
    return path + ' !== undefined && ' + path + ' instanceof Date';
};

keywords.type = function (context) {
    if (!context.schema.type) {
        return;
    }

    var specified = Array.isArray(context.schema.type) ? context.schema.type : [context.schema.type],
        src = specified.map(function mapType(type) {
            return types[type] ? types[type](context.path) || 'true' : 'true';
        }).join(' || ');

    if (src) {
        context.code('if (!(' + src + ')) {');

        context.error('type');

        context.code('}');
    }
};

keywords['enum'] = function (context) {
    var arr = context.schema['enum'],
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

    context.code('if (!(' + clauses.join(' || ') + ')) {');
    context.error('enum');
    context.code('}');
};

keywords.minimum = function (context) {
    if (typeof context.schema.minimum === 'number') {
        context.code('if (' + context.path + ' < ' + context.schema.minimum + ') {');
        context.error('minimum');
        context.code('}');
    }
};

keywords.exclusiveMinimum = function (context) {
    if (context.schema.exclusiveMinimum === true && typeof context.schema.minimum === 'number') {
        context.code('if (' + context.path + ' === ' + context.schema.minimum + ') {');
        context.error('exclusiveMinimum');
        context.code('}');
    }
};

keywords.maximum = function (context) {
    if (typeof context.schema.maximum === 'number') {
        context.code('if (' + context.path + ' > ' + context.schema.maximum + ') {');
        context.error('maximum');
        context.code('}');
    }
};

keywords.exclusiveMaximum = function (context) {
    if (context.schema.exclusiveMaximum === true && typeof context.schema.maximum === 'number') {
        context.code('if (' + context.path + ' === ' + context.schema.maximum + ') {');
        context.error('exclusiveMaximum');
        context.code('}');
    }
};

keywords.multipleOf = function (context) {
    if (typeof context.schema.multipleOf === 'number') {
        var mul = context.schema.multipleOf,
            decimals = mul.toString().length - mul.toFixed(0).length - 1,
            pow = decimals > 0 ? Math.pow(10, decimals) : 1,
            path = context.path;

        if (decimals > 0) {
            context.code('if (+(Math.round((' + path + ' * ' + pow + ') + "e+" + ' + decimals + ') + "e-" + ' + decimals + ') % ' + (mul * pow) + ' !== 0) {');
        } else {
            context.code('if (((' + path + ' * ' + pow + ') % ' + (mul * pow) + ') !== 0) {');
        }

        context.error('multipleOf');
        context.code('}');
    }
};

keywords.minLength = function (context) {
    if (isInteger(context.schema.minLength)) {
        context.code('if (' + context.path + '.length < ' + context.schema.minLength + ') {');
        context.error('minLength');
        context.code('}');
    }
};

keywords.maxLength = function (context) {
    if (isInteger(context.schema.maxLength)) {
        context.code('if (' + context.path + '.length > ' + context.schema.maxLength + ') {');
        context.error('maxLength');
        context.code('}');
    }
};

keywords.pattern = function (context) {
    var regex = typeof context.schema.pattern === 'string' ?
        new RegExp(context.schema.pattern) :
        context.schema.pattern;

    if (type(regex) === 'regexp') {
        context.code('if (!(' + inlineRegex(regex) + ').test(' + context.path + ')) {');
        context.error('pattern');
        context.code('}');
    }
};

keywords.format = function (context) {
    if (typeof context.schema.format !== 'string' || !formats[context.schema.format]) {
        return;
    }

    context.code('if (!(' + formats[context.schema.format] + ').test(' + context.path + ')) {');
    context.error('format');
    context.code('}');
};

keywords.minItems = function (context) {
    if (isInteger(context.schema.minItems)) {
        context.code('if (' + context.path + '.length < ' + context.schema.minItems + ') {');
        context.error('minItems');
        context.code('}');
    }
};

keywords.maxItems = function (context) {
    if (isInteger(context.schema.maxItems)) {
        context.code('if (' + context.path + '.length > ' + context.schema.maxItems + ') {');
        context.error('maxItems');
        context.code('}');
    }
};

keywords.additionalItems = function (context) {
    if (context.schema.additionalItems === false && Array.isArray(context.schema.items)) {
        context.code('if (' + context.path + '.length > ' + context.schema.items.length + ') {');
        context.error('additionalItems');
        context.code('}');
    }
};

keywords.uniqueItems = function (context) {
    if (context.schema.uniqueItems) {
        context.code('if (unique(' + context.path + ').length !== ' + context.path + '.length) {');
        context.error('uniqueItems');
        context.code('}');
    }
};

keywords.items = function (context) {
    var index = context.declare(0),
        i = 0;

    if (type(context.schema.items) === 'object') {
        context.code('for (' + index + '; ' + index + ' < ' + context.path + '.length; ' + index + '++) {');

        context.validate(context.path + '[' + index + ']', context.schema.items, context.noFailFast);

        context.code('}');
    }
    else if (Array.isArray(context.schema.items)) {
        for (; i < context.schema.items.length; i++) {
            context.code('if (' + context.path + '.length - 1 >= ' + i + ') {');

            context.validate(context.path + '[' + i + ']', context.schema.items[i], context.noFailFast);

            context.code('}');
        }

        if (type(context.schema.additionalItems) === 'object') {
            context.code('for (' + index + ' = ' + i + '; ' + index + ' < ' + context.path + '.length; ' + index + '++) {');

            context.validate(context.path + '[' + index + ']', context.schema.additionalItems, context.noFailFast);

            context.code('}');
        }
    }
};

keywords.maxProperties = function (context) {
    if (isInteger(context.schema.maxProperties)) {
        context.code('if (Object.keys(' + context.path + ').length > ' + context.schema.maxProperties + ') {');
        context.error('maxProperties');
        context.code('}');
    }
};

keywords.minProperties = function (context) {
    if (isInteger(context.schema.minProperties)) {
        context.code('if (Object.keys(' + context.path + ').length < ' + context.schema.minProperties + ') {');
        context.error('minProperties');
        context.code('}');
    }
};

keywords.required = function (context) {
    if (!Array.isArray(context.schema.required)) {
        return;
    }

    for (var i = 0; i < context.schema.required.length; i++) {
        context.code('if (' + appendToPath(context.path, context.schema.required[i]) + ' === undefined) {');
        context.error('required', context.schema.required[i]);
        context.code('}');
    }
};

keywords.properties = function (context) {
    if (context.validatedProperties) {
        // prevent multiple generations of property validation
        return;
    }

    var props = context.schema.properties,
        propKeys = type(props) === 'object' ? Object.keys(props) : [],
        patProps = context.schema.patternProperties,
        patterns = type(patProps) === 'object' ? Object.keys(patProps) : [],
        addProps = context.schema.additionalProperties,
        addPropsCheck = addProps === false || type(addProps) === 'object',
        prop, i, nestedPath;

    // do not use this generator if we have patternProperties or additionalProperties
    // instead, the generator below will be used for all three keywords
    if (!propKeys.length || patterns.length || addPropsCheck) {
        return;
    }

    for (i = 0; i < propKeys.length; i++) {
        prop = propKeys[i];
        nestedPath = appendToPath(context.path, prop);

        context.code('if (' + nestedPath + ' !== undefined) {');

        context.validate(nestedPath, props[prop], context.noFailFast);

        context.code('}');
    }

    context.validatedProperties = true;
};

keywords.patternProperties = keywords.additionalProperties = function (context) {
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
        keys, key, n, found,
        propKey, pattern, i;

    if (!propKeys.length && !patterns.length && !addPropsCheck) {
        return;
    }

    keys = context.declare('[]');
    key = context.declare('""');
    n = context.declare(0);

    if (addPropsCheck) {
        found = context.declare(false);
    }

    context.code(keys + ' = Object.keys(' + context.path + ')');

    context.code('for (' + n + '; ' + n + ' < ' + keys + '.length; ' + n + '++) {')
        (key + ' = ' + keys + '[' + n + ']')

        ('if (' + context.path + '[' + key + '] === undefined) {')
            ('continue')
        ('}');

    if (addPropsCheck) {
        context.code(found + ' = false');
    }

    // validate regular properties
    for (i = 0; i < propKeys.length; i++) {
        propKey = propKeys[i];

        context.code('if (' + key + ' === "' + propKey + '") {');

        if (addPropsCheck) {
            context.code(found + ' = true');
        }

        context.validate(appendToPath(context.path, propKey), props[propKey], context.noFailFast);

        context.code('}');
    }

    // validate pattern properties
    for (i = 0; i < patterns.length; i++) {
        pattern = patterns[i];

        context.code('if ((' + inlineRegex(pattern) + ').test(' + key + ')) {');

        if (addPropsCheck) {
            context.code(found + ' = true');
        }

        context.validate(context.path + '[' + key + ']', patProps[pattern], context.noFailFast);

        context.code('}');
    }

    // validate additional properties
    if (addPropsCheck) {
        context.code('if (!' + found + ') {');

        if (addProps === false) {
            // do not allow additional properties
            context.error('additionalProperties');
        }
        else {
            // validate additional properties
            context.validate(context.path + '[' + key + ']', addProps, context.noFailFast);
        }

        context.code('}');
    }

    context.code('}');

    context.validatedProperties = true;
};

keywords.dependencies = function (context) {
    if (type(context.schema.dependencies) !== 'object') {
        return;
    }

    var key, dep, i = 0;

    for (key in context.schema.dependencies) {
        dep = context.schema.dependencies[key];

        context.code('if (' + appendToPath(context.path, key) + ' !== undefined) {');

        if (type(dep) === 'object') {
            //schema dependency
            context.validate(context.path, dep, context.noFailFast);
        }
        else {
            // property dependency
            for (i; i < dep.length; i++) {
                context.code('if (' + appendToPath(context.path, dep[i]) + ' === undefined) {');
                context.error('dependencies', dep[i]);
                context.code('}');
            }
        }

        context.code('}');
    }
};

keywords.allOf = function (context) {
    if (!Array.isArray(context.schema.allOf)) {
        return;
    }

    for (var i = 0; i < context.schema.allOf.length; i++) {
        context.validate(context.path, context.schema.allOf[i], context.noFailFast);
    }
};

keywords.anyOf = function (context) {
    if (!Array.isArray(context.schema.anyOf)) {
        return;
    }

    var errCount = context.declare(0),
        initialCount = context.declare(0),
        found = context.declare(false),
        i = 0;

    context.code(initialCount + ' = errors.length');

    for (; i < context.schema.anyOf.length; i++) {
        context.code('if (!' + found + ') {');

        context.code(errCount + ' = errors.length');

        context.validate(context.path, context.schema.anyOf[i], true);

        context.code(found + ' = errors.length === ' + errCount)
        ('}');
    }

    context.code('if (!' + found + ') {');

    context.error('anyOf');

    context.code('} else {')
        ('errors.length = ' + initialCount)
    ('}');
};

keywords.oneOf = function (context) {
    if (!Array.isArray(context.schema.oneOf)) {
        return;
    }

    var matching = context.declare(0),
        initialCount = context.declare(0),
        errCount = context.declare(0),
        i = 0;

    context.code(initialCount + ' = errors.length');

    for (; i < context.schema.oneOf.length; i++) {
        context.code(errCount + ' = errors.length');

        context.validate(context.path, context.schema.oneOf[i], true);

        context.code('if (errors.length === ' + errCount + ') {')
            (matching + '++')
        ('}');
    }

    context.code('if (' + matching + ' !== 1) {');

    context.error('oneOf');

    context.code('} else {')
        ('errors.length = ' + initialCount)
    ('}');
};

keywords.not = function (context) {
    if (type(context.schema.not) !== 'object') {
        return;
    }

    var errCount = context.declare(0);

    context.code(errCount + ' = errors.length');

    context.validate(context.path, context.schema.not, true);

    context.code('if (errors.length === ' + errCount + ') {');

    context.error('not');

    context.code('} else {')
        ('errors.length = ' + errCount)
    ('}');
};

['minimum', 'exclusiveMinimum', 'maximum', 'exclusiveMaximum', 'multipleOf']
    .forEach(function (keyword) { keywords[keyword].type = 'number'; });

['minLength', 'maxLength', 'pattern', 'format']
    .forEach(function (keyword) { keywords[keyword].type = 'string'; });

['minItems', 'maxItems', 'additionalItems', 'uniqueItems', 'items']
    .forEach(function (keyword) { keywords[keyword].type = 'array'; });

['maxProperties', 'minProperties', 'required', 'properties', 'patternProperties', 'additionalProperties', 'dependencies']
    .forEach(function (keyword) { keywords[keyword].type = 'object'; });

function getGenerators(schema) {
    var keys = Object.keys(schema),
        start = [],
        perType = {},
        gen, i;

    for (i = 0; i < keys.length; i++) {
        gen = keywords[keys[i]];

        if (!gen) {
            continue;
        }

        if (gen.type) {
            if (!perType[gen.type]) {
                perType[gen.type] = [];
            }

            perType[gen.type].push(gen);
        }
        else {
            start.push(gen);
        }
    }

    return start.concat(Object.keys(perType).reduce(function (arr, key) {
        return arr.concat(perType[key]);
    }, []));
}

function replaceIndexedProperty(match) {
    var index = match.replace(PATH_PROP_REPLACE_EXPR, '$1');

    if (!isNaN(+index)) {
        // numeric index in array
        return '.' + index;
    }
    else if (index[0] === '"') {
        // string key for an object property
        return '[\\"' + index.substr(1, index.length - 2) + '\\"]';
    }

    // variable containing the actual key
    return '." + ' + index + ' + "';
}

function getPathExpression(path) {
    return '"' + path.replace(PATH_REPLACE_EXPR, replaceIndexedProperty).substr(5) + '"';
}

function clone(obj) {
    var cloned = obj,
        objType = type(obj),
        key, i;

    if (objType === 'object') {
        cloned = {};

        for (key in obj) {
            cloned[key] = clone(obj[key]);
        }
    }
    else if (objType === 'array') {
        cloned = [];

        for (i = 0; i < obj.length; i++) {
            cloned[i] = clone(obj[i]);
        }
    }
    else if (objType === 'regexp') {
        return new RegExp(obj);
    }
    else if (objType === 'date') {
        return new Date(obj.toJSON());
    }

    return cloned;
}

function build(schema, def, additional, resolver) {
    var defType, defValue, key, i;

    if (type(schema) !== 'object') {
        return def;
    }

    schema = resolver.resolve(schema);

    if (def === undefined && schema.hasOwnProperty('default')) {
        def = clone(schema['default']);
    }

    defType = type(def);

    if (defType === 'object' && type(schema.properties) === 'object') {
        for (key in schema.properties) {
            defValue = build(schema.properties[key], def[key], additional, resolver);

            if (defValue !== undefined) {
                def[key] = defValue;
            }
        }

        for (key in def) {
            if (!(key in schema.properties) &&
                (schema.additionalProperties === false ||
                (additional === false && !schema.additionalProperties))) {
                delete def[key];
            }
        }
    }
    else if (defType === 'array' && schema.items) {
        if (type(schema.items) === 'array') {
            for (i = 0; i < schema.items.length; i++) {
                defValue = build(schema.items[i], def[i], additional, resolver);

                if (defValue !== undefined || i < def.length) {
                    def[i] = defValue;
                }
            }
        }
        else if (def.length) {
            for (i = 0; i < def.length; i++) {
                def[i] = build(schema.items, def[i], additional, resolver);
            }
        }
    }

    return def;
}

function jsen(schema, options) {
    if (type(schema) !== 'object') {
        throw new Error(INVALID_SCHEMA);
    }

    options = options || {};

    var missing$Ref = options.missing$Ref || false,
        resolver = new SchemaResolver(schema, options.schemas, missing$Ref),
        counter = 0,
        id = function () { return 'i' + (counter++); },
        funcache = {},
        compiled,
        refs = {
            errors: []
        },
        scope = {
            equal: equal,
            unique: unique,
            refs: refs
        };

    function cache(schema) {
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

            Object.defineProperty(cached.func, 'errors', {
                get: function () {
                    return func.errors;
                }
            });

            refs[cached.key] = cached.func;
        }

        return 'refs.' + cached.key;
    }

    function compile(schema) {
        function declare(def) {
            var variname = id();

            code.def(variname, def);

            return variname;
        }

        function validate(path, schema, noFailFast) {
            var context,
                cachedRef,
                pathExp,
                index,
                lastType,
                format,
                gens,
                gen,
                i;

            function error(keyword, key) {
                var varid,
                    errorPath = path,
                    message = (key && schema.properties && schema.properties[key] && schema.properties[key].requiredMessage) ||
                        schema.invalidMessage;

                if (!message) {
                    message = key && schema.properties && schema.properties[key] && schema.properties[key].messages &&
                        schema.properties[key].messages[keyword] ||
                        schema.messages && schema.messages[keyword];
                }

                if (path.indexOf('[') > -1) {
                    // create error objects dynamically when path contains indexed property expressions
                    errorPath = getPathExpression(path);

                    if (key) {
                        errorPath = errorPath ? errorPath + ' + ".' + key + '"' : key;
                    }

                    code('errors.push({')
                        ('path: ' +  errorPath + ', ')
                        ('keyword: "' + keyword + '"' + (message ? ',' : ''));

                    if (message) {
                        code('message: "' + message + '"');
                    }

                    code('})');
                }
                else {
                    // generate faster code when no indexed properties in the path
                    varid = id();

                    errorPath = errorPath.substr(5);

                    if (key) {
                        errorPath = errorPath ? errorPath + '.' + key : key;
                    }

                    refs[varid] = {
                        path: errorPath,
                        keyword: keyword
                    };

                    if (message) {
                        refs[varid].message = message;
                    }

                    code('errors.push(refs.' + varid + ')');
                }

                if (!noFailFast && !options.greedy) {
                    code('return (validate.errors = errors) && false');
                }
            }

            if (schema.$ref !== undefined) {
                cachedRef = cache(schema);
                pathExp = getPathExpression(path);
                index = declare(0);

                code('if (!' + cachedRef + '(' + path + ')) {')
                    ('if (' + cachedRef + '.errors) {')
                        ('errors.push.apply(errors, ' + cachedRef + '.errors)')
                        ('for (' + index + ' = 0; ' + index + ' < ' + cachedRef + '.errors.length; ' + index + '++) {')
                            ('if (' + cachedRef + '.errors[' + index + '].path) {')
                                ('errors[errors.length - ' + cachedRef + '.errors.length + ' + index + '].path = ' + pathExp +
                                    ' + "." + ' + cachedRef + '.errors[' + index + '].path')
                            ('} else {')
                                ('errors[errors.length - ' + cachedRef + '.errors.length + ' + index + '].path = ' + pathExp)
                            ('}')
                        ('}')
                    ('}')
                ('}');

                return;
            }

            context = {
                path: path,
                schema: schema,
                code: code,
                declare: declare,
                validate: validate,
                error: error,
                noFailFast: noFailFast
            };

            gens = getGenerators(schema);

            for (i = 0; i < gens.length; i++) {
                gen = gens[i];

                if (gen.type && lastType !== gen.type) {
                    if (lastType) {
                        code('}');
                    }

                    lastType = gen.type;

                    code('if (' + types[gen.type](path) + ') {');
                }

                gen(context);
            }

            if (lastType) {
                code('}');
            }

            if (schema.format && options.formats) {
                format = options.formats[schema.format];

                if (format) {
                    if (typeof format === 'string' || format instanceof RegExp) {
                        code('if (!(' + inlineRegex(format) + ').test(' + context.path + ')) {');
                        error('format');
                        code('}');
                    }
                    else if (typeof format === 'function') {
                        (scope.formats || (scope.formats = {}))[schema.format] = format;
                        (scope.schemas || (scope.schemas = {}))[schema.format] = schema;

                        code('if (!formats["' + schema.format + '"](' + context.path + ', schemas["' + schema.format + '"])) {');
                        error('format');
                        code('}');
                    }
                }
            }
        }

        var code = func('validate', 'data')
            ('var errors = []');

        validate('data', schema);

        code('return (validate.errors = errors) && errors.length === 0');

        compiled = code.compile(scope);

        compiled.errors = [];

        compiled.build = function (initial, options) {
            return build(
                schema,
                (options && options.copy === false ? initial : clone(initial)),
                options && options.additionalProperties,
                resolver);
        };

        return compiled;
    }

    return compile(schema);
}

jsen.browser = browser;
jsen.clone = clone;
jsen.equal = equal;
jsen.unique = unique;

module.exports = jsen;
