'use strict';

var url = require('url'),
    metaschema = require('./metaschema.json'),
    INVALID_SCHEMA_REFERENCE = 'jsen: invalid schema reference',
    DUPLICATE_SCHEMA_ID = 'jsen: duplicate schema id';

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

function refToObj(ref) {
    var index = ref.indexOf('#'),
        ret = {
            base: ref.substr(0, index),
            path: []
        };

    if (index < 0) {
        ret.base = ref;
        return ret;
    }

    ref = ref.substr(index + 1);

    if (!ref) {
        return ret;
    }

    ret.path = ref.split('/').map(function (segment) {
        // Reference: http://tools.ietf.org/html/draft-ietf-appsawg-json-pointer-08#section-3
        return decodeURIComponent(segment)
            .replace(/~1/g, '/')
            .replace(/~0/g, '~');
    });

    if (ref[0] === '/') {
        ret.path.shift();
    }

    return ret;
}

function SchemaResolver(rootSchema, external, missing$Ref) {  // jshint ignore: line
    this.rootSchema = rootSchema;
    this.resolvedRootSchema = null;
    this.resolvers = null;
    this.cache = {};
    this.idCache = {};
    this.missing$Ref = missing$Ref;

    this._buildIdCache(rootSchema, '');

    this._buildResolvers(external);
}

SchemaResolver.prototype._buildIdCache = function (schema, baseId) {
    var id = baseId,
        keys, key, i;

    if (!schema || typeof schema !== 'object') {
        return;
    }

    if (schema.id) {
        id = url.resolve(baseId, schema.id);

        if (this.idCache[id] && id !== baseId) {
            throw new Error(DUPLICATE_SCHEMA_ID + ' ' + id);
        }

        this.idCache[id] = schema;
    }

    keys = Object.keys(schema);

    for (i = 0; i < keys.length; i++) {
        key = keys[i];

        if (schema[key] && typeof schema[key] === 'object') {
            this._buildIdCache(schema[key], id);
        }
    }
};

SchemaResolver.prototype._buildResolvers = function (schemas) {
    if (!schemas || typeof schemas !== 'object') {
        return;
    }

    var keys = Object.keys(schemas),
        resolvers = {},
        resolver,
        key, i;

    for (i = 0; i < keys.length; i++) {
        key = keys[i];

        if (this.idCache[key]) {
            throw new Error(DUPLICATE_SCHEMA_ID + ' ' + key);
        }

        resolver = new SchemaResolver(schemas[key]);

        this.idCache[key] = resolver.resolve(resolver.rootSchema);

        this._buildIdCache(this.idCache[key], key);

        resolvers[key] = resolver;
    }

    this.resolvers = resolvers;
};

SchemaResolver.prototype.resolveRef = function (ref) {
    var err = new Error(INVALID_SCHEMA_REFERENCE + ' ' + ref),
        root = this.rootSchema,
        resolvedRoot = this.resolvedRootSchema,
        idCache = this.idCache,
        externalResolver,
        pathDescriptor,
        dest, path;

    if (!ref || typeof ref !== 'string') {
        throw err;
    }

    if (ref === metaschema.id) {
        dest = metaschema;
    }

    if (dest === undefined && idCache[ref]) {
        dest = idCache[ref];
    }

    if (dest === undefined) {
        pathDescriptor = refToObj(ref);

        path = pathDescriptor.path.slice(0);

        if (pathDescriptor.base) {
            if (idCache[pathDescriptor.base]) {
                dest = get(idCache[pathDescriptor.base], path.slice(0));
            }
            else {
                path.unshift(pathDescriptor.base);
            }
        }
    }

    if (dest === undefined && resolvedRoot) {
        dest = get(resolvedRoot, path.slice(0));
    }

    if (dest === undefined) {
        dest = get(root, path.slice(0));
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
    var descriptor = refToObj(pointer),
        path = descriptor.path;

    if (descriptor.base) {
        path = [descriptor.base].concat(path);
    }

    return get(obj, path);
};

module.exports = SchemaResolver;