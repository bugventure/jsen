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
        } else {
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
        key,
        i;

    for (i = 0; i < keys.length; i++) {
        key = keys[i];
        resolvers[key] = new SchemaResolver(schemas[key]);
    }

    return resolvers;
}

function SchemaResolver(rootSchema, external) {  // jshint ignore: line
    this.rootSchema = rootSchema;
    this.cache = {};
    this.resolved = null;
    this.missing = [];

    this.resolvers = external && typeof external === 'object' ?
        getResolvers(external) :
        null;

    if (this.resolvers) {
        var resLen = this.resolvers.length,
            mapLen = this.missing.length,
            missingMap = {},
            subMissing,
            subMissingLen,
            subMissingName,
            i,
            j;

        for (i = 0; i < mapLen; i++) {
            missingMap[this.missing[i]] = true;
        }

        for (i = 0; i < resLen; i++) {
            subMissing = this.resolvers[i].missing;
            subMissingLen = subMissing.length;

            for (j = 0; j < subMissingLen; j++) {
                subMissingName = subMissing[j];

                if (!missingMap.hasOwnProperty(subMissingName)) {
                    missingMap[subMissingName] = true;
                    this.missing[resLen++] = subMissing[j];
                }
            }
        }
    }
}

SchemaResolver.prototype.resolveRef = function (ref, missing$Ref) {
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
        if (missing$Ref) {
            this.missing.push(ref);
            dest = {
                additionalProperties: true
            };
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

SchemaResolver.prototype.resolve = function (schema, missing$Ref) {
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

    resolved = this.resolveRef(ref, missing$Ref);

    if (schema === this.rootSchema && schema !== resolved) {
        // substitute the resolved root schema
        this.rootSchema = resolved;
    }

    return resolved;
};

module.exports = SchemaResolver;