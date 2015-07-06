/*
 * jsen
 * https://github.com/bugventure/jsen
 *
 * Copyright (c) 2015 Veli Pehlivanov <bugventure@gmail.com>
 * Licensed under the MIT license
 */

(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jsen = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib/jsen.js');
},{"./lib/jsen.js":5}],2:[function(require,module,exports){
'use strict';

function type(obj) {
    var str = Object.prototype.toString.call(obj);
    return str.substr(8, str.length - 9).toLowerCase();
}

function deepEqual(a, b) {
    var keysA = Object.keys(a).sort(),
        keysB = Object.keys(b).sort(),
        i, key;

    if (!equal(keysA, keysB)) {
        return false;
    }

    for (i = 0; i < keysA.length; i++) {
        key = keysA[i];

        if (!equal(a[key], b[key])) {
            return false;
        }
    }

    return true;
}

function equal(a, b) {  // jshint ignore: line
    var typeA = typeof a,
        typeB = typeof b,
        i;

    // get detailed object type
    if (typeA === 'object') {
        typeA = type(a);
    }

    // get detailed object type
    if (typeB === 'object') {
        typeB = type(b);
    }

    if (typeA !== typeB) {
        return false;
    }

    if (typeA === 'object') {
        return deepEqual(a, b);
    }

    if (typeA === 'regexp') {
        return a.toString() === b.toString();
    }

    if (typeA === 'array') {
        if (a.length !== b.length) {
            return false;
        }

        for (i = 0; i < a.length; i++) {
            if (!equal(a[i], b[i])) {
                return false;
            }
        }

        return true;
    }

    return a === b;
}

module.exports = equal;
},{}],3:[function(require,module,exports){
'use strict';

var formats = {};

// reference: http://dansnetwork.com/javascript-iso8601rfc3339-date-parser/
formats['date-time'] = /(\d\d\d\d)(-)?(\d\d)(-)?(\d\d)(T)?(\d\d)(:)?(\d\d)(:)?(\d\d)(\.\d+)?(Z|([+-])(\d\d)(:)?(\d\d))/;
// reference: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js#L7
formats.uri = /^([a-zA-Z][a-zA-Z0-9+-.]*:){0,1}\/\/[^\s]*$/;
// reference: http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
//            http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'willful violation')
formats.email = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
// reference: https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
formats.ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
// reference: http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
formats.ipv6 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|[fF][eE]80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::([fF]{4}(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
// reference: http://stackoverflow.com/questions/106179/regular-expression-to-match-dns-hostname-or-ip-address#answer-3824105
formats.hostname = /^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]))*$/;

module.exports = formats;
},{}],4:[function(require,module,exports){
'use strict';

module.exports = function func() {
    var name = arguments[0] || '',
        args = [].join.call([].slice.call(arguments, 1), ', '),
        lines = '',
        vars = '',
        ind = 1,
        tab = '  ',
        bs = '{[',  // block start
        be = '}]',  // block end
        space = function () {
            return new Array(ind + 1).join(tab);
        },
        push = function (line) {
            lines += space() + line + '\n';
        },
        builder = function (line) {
            var first = line[0],
                last = line[line.length - 1];

            if (be.indexOf(first) > -1 && bs.indexOf(last) > -1) {
                ind--;
                push(line);
                ind++;
            }
            else if (bs.indexOf(last) > -1) {
                push(line);
                ind++;
            }
            else if (be.indexOf(first) > -1) {
                ind--;
                push(line);
            }
            else {
                push(line);
            }

            return builder;
        };

    builder.def = function (id, def) {
        vars += space() + 'var ' + id + (def !== undefined ? ' = ' + def : '') + '\n';

        return builder;
    };

    builder.toSource = function () {
        return 'function ' + name + '(' + args + ') {\n' + vars + '\n' + lines + '\n}';
    };

    builder.compile = function (scope) {
        var src = 'return (' + builder.toSource() + ')',
            scp = scope || {},
            keys = Object.keys(scp),
            vals = keys.map(function (key) { return scp[key]; });

        return Function.apply(null, keys.concat(src)).apply(null, vals);
    };

    return builder;
};
},{}],5:[function(require,module,exports){
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

        context.code((i ? 'else ' : '') + 'if (' + key + ' === "' + propKey + '") {');

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

},{"./equal.js":2,"./formats.js":3,"./func.js":4,"./resolver.js":7,"./unique.js":8}],6:[function(require,module,exports){
module.exports={
    "id": "http://json-schema.org/draft-04/schema#",
    "$schema": "http://json-schema.org/draft-04/schema#",
    "description": "Core schema meta-schema",
    "definitions": {
        "schemaArray": {
            "type": "array",
            "minItems": 1,
            "items": { "$ref": "#" }
        },
        "positiveInteger": {
            "type": "integer",
            "minimum": 0
        },
        "positiveIntegerDefault0": {
            "allOf": [ { "$ref": "#/definitions/positiveInteger" }, { "default": 0 } ]
        },
        "simpleTypes": {
            "anyOf": [
                { "enum": [ "array", "boolean", "integer", "null", "number", "object", "string", "any" ] },
                { "type": "string" }
            ]
        },
        "stringArray": {
            "type": "array",
            "items": { "type": "string" },
            "minItems": 1,
            "uniqueItems": true
        }
    },
    "type": "object",
    "properties": {
        "id": {
            "type": "string",
            "format": "uri"
        },
        "$schema": {
            "type": "string",
            "format": "uri"
        },
        "title": {
            "type": "string"
        },
        "description": {
            "type": "string"
        },
        "default": {},
        "multipleOf": {
            "type": "number",
            "minimum": 0,
            "exclusiveMinimum": true
        },
        "maximum": {
            "type": "number"
        },
        "exclusiveMaximum": {
            "type": "boolean",
            "default": false
        },
        "minimum": {
            "type": "number"
        },
        "exclusiveMinimum": {
            "type": "boolean",
            "default": false
        },
        "maxLength": { "$ref": "#/definitions/positiveInteger" },
        "minLength": { "$ref": "#/definitions/positiveIntegerDefault0" },
        "pattern": {
            "type": "string",
            "format": "regex"
        },
        "additionalItems": {
            "anyOf": [
                { "type": "boolean" },
                { "$ref": "#" }
            ],
            "default": {}
        },
        "items": {
            "anyOf": [
                { "$ref": "#" },
                { "$ref": "#/definitions/schemaArray" }
            ],
            "default": {}
        },
        "maxItems": { "$ref": "#/definitions/positiveInteger" },
        "minItems": { "$ref": "#/definitions/positiveIntegerDefault0" },
        "uniqueItems": {
            "type": "boolean",
            "default": false
        },
        "maxProperties": { "$ref": "#/definitions/positiveInteger" },
        "minProperties": { "$ref": "#/definitions/positiveIntegerDefault0" },
        "required": { "$ref": "#/definitions/stringArray" },
        "additionalProperties": {
            "anyOf": [
                { "type": "boolean" },
                { "$ref": "#" }
            ],
            "default": {}
        },
        "definitions": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "default": {}
        },
        "properties": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "default": {}
        },
        "patternProperties": {
            "type": "object",
            "additionalProperties": { "$ref": "#" },
            "default": {}
        },
        "dependencies": {
            "type": "object",
            "additionalProperties": {
                "anyOf": [
                    { "$ref": "#" },
                    { "$ref": "#/definitions/stringArray" }
                ]
            }
        },
        "enum": {
            "type": "array",
            "minItems": 1,
            "uniqueItems": true
        },
        "type": {
            "anyOf": [
                { "$ref": "#/definitions/simpleTypes" },
                {
                    "type": "array",
                    "items": { "$ref": "#/definitions/simpleTypes" },
                    "minItems": 1,
                    "uniqueItems": true
                }
            ]
        },
        "allOf": { "$ref": "#/definitions/schemaArray" },
        "anyOf": { "$ref": "#/definitions/schemaArray" },
        "oneOf": { "$ref": "#/definitions/schemaArray" },
        "not": { "$ref": "#" }
    },
    "dependencies": {
        "exclusiveMaximum": [ "maximum" ],
        "exclusiveMinimum": [ "minimum" ]
    },
    "default": {}
}

},{}],7:[function(require,module,exports){
'use strict';

var metaschema = require('./metaschema.json'),
    refRegex = /#?(\/?\w+)*$/,
    INVALID_SCHEMA_REFERENCE = 'jsen: invalid schema reference';

function get(obj, key) {
    var parts = key.split('.'),
        subobj,
        remaining;

    if (parts.length === 1) {
        // simple key
        return obj[key];
    }

    // compound and nested properties
    // e.g. key('nested.key', { nested: { key: 123 } }) === 123
    // e.g. key('compount.key', { 'compound.key': 456 }) === 456
    while (parts.length && obj !== undefined && obj !== null) {
        // take a part from the front
        remaining = parts.slice(0);
        subobj = undefined;

        // try to match larger compound keys containing dots
        while (remaining.length && subobj === undefined) {
            subobj = obj[remaining.join('.')];

            if (subobj === undefined) {
                remaining.pop();
            }
        }

        // if there is a matching larger compount key, use that
        if (subobj !== undefined) {
            obj = subobj;

            // remove keys from the parts, respectively
            while (remaining.length) {
                remaining.shift();
                parts.shift();
            }
        }
        else {
            // treat like normal simple keys
            obj = obj[parts.shift()];
        }
    }

    return obj;
}

// http://tools.ietf.org/html/draft-ietf-appsawg-json-pointer-08#section-3
function unescape(pointer) {
    return decodeURIComponent(pointer)
        .replace(/~1/g, '/')
        .replace(/~0/g, '~');
}

function refToPath(ref) {
    if (ref.indexOf('#') < 0) {
        return ref;
    }

    var path = ref.split('#')[1];

    if (path) {
        path = path
            .split('/')
            .map(unescape)
            .join('.');

        if (path[0] === '.') {
            path = path.substr(1);
        }
    }

    return path;
}

function refFromId(obj, ref) {
    if (obj && typeof obj === 'object') {
        if (obj.id === ref) {
            return obj;
        }

        return Object.keys(obj).reduce(function (resolved, key) {
            return resolved || refFromId(obj[key], ref);
        }, undefined);
    }

    return undefined;
}

function getResolvers(schemas) {
    var keys = Object.keys(schemas),
        resolvers = {},
        key, i;

    for (i = 0; i < keys.length; i++) {
        key = keys[i];
        resolvers[key] = new SchemaResolver(schemas[key]);
    }

    return resolvers;
}

function SchemaResolver(rootSchema, external, missing$Ref) {  // jshint ignore: line
    this.rootSchema = rootSchema;
    this.cache = {};
    this.resolved = null;
    this.missing$Ref = missing$Ref;

    this.resolvers = external && typeof external === 'object' ?
        getResolvers(external) :
        null;
}

SchemaResolver.prototype.resolveRef = function (ref) {
    var err = new Error(INVALID_SCHEMA_REFERENCE + ' ' + ref),
        root = this.rootSchema,
        externalResolver,
        path,
        dest;

    if (!ref || typeof ref !== 'string' || !refRegex.test(ref)) {
        throw err;
    }

    if (ref === metaschema.id) {
        dest = metaschema;
    }

    if (!dest) {
        dest = refFromId(root, ref);
    }

    if (!dest) {
        path = refToPath(ref);

        dest = path ? get(root, path) : root;
    }

    if (!dest && path && this.resolvers) {
        externalResolver = get(this.resolvers, path);

        if (externalResolver) {
            dest = externalResolver.resolve(externalResolver.rootSchema);
        }
    }

    if (!dest || typeof dest !== 'object') {
        if (this.missing$Ref) {
            dest = {};
        } else {
            throw err;
        }
    }

    if (this.cache[ref] === dest) {
        return dest;
    }

    this.cache[ref] = dest;

    if (dest.$ref !== undefined) {
        dest = this.cache[ref] = this.resolveRef(dest.$ref);
    }

    return dest;
};

SchemaResolver.prototype.resolve = function (schema) {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }

    var ref = schema.$ref,
        resolved = this.cache[ref];

    if (ref === undefined) {
        return schema;
    }

    if (resolved) {
        return resolved;
    }

    resolved = this.resolveRef(ref);

    if (schema === this.rootSchema && schema !== resolved) {
        // substitute the resolved root schema
        this.rootSchema = resolved;
    }

    return resolved;
};

module.exports = SchemaResolver;
},{"./metaschema.json":6}],8:[function(require,module,exports){
'use strict';

var equal = require('./equal.js');

function findIndex(arr, value, comparator) {
    for (var i = 0, len = arr.length; i < len; i++) {
        if (comparator(arr[i], value)) {
            return i;
        }
    }

    return -1;
}

module.exports = function unique(arr) {
    return arr.filter(function uniqueOnly(value, index, self) {
        return findIndex(self, value, equal) === index;
    });
};

module.exports.findIndex = findIndex;
},{"./equal.js":2}]},{},[1])(1)
});