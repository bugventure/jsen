'use strict';

var metaschema = require('./metaschema.json'),
    INVALID_SCHEMA_REFERENCE = 'jsen: invalid schema reference';

function get(obj, path) {
    if (!path.length) {
        return obj;
    }

    var key = path.shift(),
        val;

    if (obj && typeof obj === 'object' && obj.hasOwnProperty(key)) {
        val = obj[key];
    }

    if (path.length) {
        if (val && typeof val === 'object') {
            return get(val, path);
        }

        return undefined;
    }

    return val;
}

function refToPath(ref) {
    var index = ref.indexOf('#'),
        path;

    if (index !== 0) {
        return [ref];
    }

    ref = ref.substr(index + 1);

    if (!ref) {
        return [];
    }

    path = ref.split('/').map(function (segment) {
        // Reference: http://tools.ietf.org/html/draft-ietf-appsawg-json-pointer-08#section-3
        return decodeURIComponent(segment)
            .replace(/~1/g, '/')
            .replace(/~0/g, '~');
    });

    if (ref[0] === '/') {
        path.shift();
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
    this.resolvedRootSchema = null;
    this.cache = {};
    this.missing$Ref = missing$Ref;

    this.resolvers = external && typeof external === 'object' ?
        getResolvers(external) :
        null;
}

SchemaResolver.prototype.resolveRef = function (ref) {
    var err = new Error(INVALID_SCHEMA_REFERENCE + ' ' + ref),
        root = this.rootSchema,
        resolvedRoot = this.resolvedRootSchema,
        externalResolver,
        path,
        dest;

    if (!ref || typeof ref !== 'string') {
        throw err;
    }

    if (ref === metaschema.id) {
        dest = metaschema;
    }

    if (dest === undefined && resolvedRoot) {
        dest = refFromId(resolvedRoot, ref);
    }

    if (dest === undefined) {
        dest = refFromId(root, ref);
    }

    if (dest === undefined) {
        path = refToPath(ref);

        if (resolvedRoot) {
            dest = get(resolvedRoot, path.slice(0));
        }

        if (dest === undefined) {
            dest = get(root, path.slice(0));
        }
    }

    if (dest === undefined && path.length && this.resolvers) {
        externalResolver = get(this.resolvers, path);

        if (externalResolver) {
            dest = externalResolver.resolve(externalResolver.rootSchema);
        }
    }

    if (dest === undefined || typeof dest !== 'object') {
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

    if (resolved !== undefined) {
        return resolved;
    }

    resolved = this.resolveRef(ref);

    if (schema === this.rootSchema && schema !== resolved) {
        // cache the resolved root schema
        this.resolvedRootSchema = resolved;
    }

    return resolved;
};

SchemaResolver.resolvePointer = function (obj, pointer) {
    return get(obj, refToPath(pointer));
};

module.exports = SchemaResolver;