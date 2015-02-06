'use strict';

var util = require('util'),
    type = require('./type.js'),
    strings = require('./strings.js'),
    metaschema = require('./metaschema.json'),
    refRegex = /#?(\/?\w+)*$/;

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
    while (parts.length && type.isDefined(obj)) {
        // take a part from the front
        remaining = parts.slice(0);
        subobj = undefined;

        // try to match larger compound keys containing dots
        while (remaining.length && type.isUndefined(subobj)) {
            subobj = obj[remaining.join('.')];

            if (type.isUndefined(subobj)) {
                remaining.pop();
            }
        }

        // if there is a matching larger compount key, use that
        if (!type.isUndefined(subobj)) {
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

function refToPath(ref) {
    var path = ref.split('#')[1];

    if (path) {
        path = path.split('/').join('.');

        if (path[0] === '.') {
            path = path.substr(1);
        }
    }

    return path;
}

function SchemaResolver(rootSchema) {
    this.rootSchema = rootSchema;
    this.cache = {};
    this.resolved = null;
}

SchemaResolver.prototype.resolveRef = function (ref) {
    var err = new Error(util.format(strings.invalidReference, ref)),
        root = this.rootSchema,
        path,
        dest;

    if (!type.isString(ref) || !ref || !refRegex.test(ref)) {
        throw err;
    }

    if (ref === metaschema.id) {
        dest = metaschema;
    }
    else {
        path = refToPath(ref);

        dest = path ? get(root, path) : root;
    }

    if (!type.isObject(dest)) {
        console.log(dest);
        throw err;
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
    if (!type.isObject(schema)) {
        return schema;
    }

    var ref = schema.$ref,
        resolved = this.cache[ref];

    if (type.isUndefined(ref)) {
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