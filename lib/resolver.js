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

function SchemaResolver(rootSchema, external, missing$Ref, baseId) {  // jshint ignore: line
    this.rootSchema = rootSchema;
    this.resolvers = null;
    this.resolvedRootSchema = null;
    this.cache = {};
    this.idCache = {};
    this.missing$Ref = missing$Ref;

    baseId = baseId || '';

    this._buildIdCache(rootSchema, baseId);

    this._buildResolvers(external, baseId);
}

SchemaResolver.prototype._buildIdCache = function (schema, baseId) {
    var id = baseId,
        keys, i;

    if (!schema || typeof schema !== 'object') {
        return;
    }

    if (schema.id) {
        id = url.resolve(baseId, schema.id);

        if (this.idCache[id] && id !== baseId) {
            throw new Error(DUPLICATE_SCHEMA_ID + ' ' + id);
        }

        this.idCache[id] = { schema: schema, resolver: this };
    }

    keys = Object.keys(schema);

    for (i = 0; i < keys.length; i++) {
        this._buildIdCache(schema[keys[i]], id);
    }
};

SchemaResolver.prototype._buildResolvers = function (schemas, baseId) {
    if (!schemas || typeof schemas !== 'object') {
        return;
    }

    var idCache = this.idCache,
        resolvers = {};

    Object.keys(schemas).forEach(function (key) {
        var id = url.resolve(baseId, key),
            resolver = new SchemaResolver(schemas[key], null, false, id);

        idCache[id] = { schema: resolver.rootSchema, resolver: resolver };

        Object.keys(resolver.idCache).forEach(function (idKey) {
            idCache[idKey] = { schema: resolver.idCache[idKey], resolver: resolver };
        });

        resolvers[key] = resolver;
    });

    this.resolvers = resolvers;
};

SchemaResolver.prototype.resolveRef = function (ref) {
    var err = new Error(INVALID_SCHEMA_REFERENCE + ' ' + ref),
        idCache = this.idCache,
        externalResolver,
        descriptor, path, cached,
        dest;

    if (!ref || typeof ref !== 'string') {
        throw err;
    }

    if (ref === metaschema.id) {
        dest = metaschema;
    }

    descriptor = refToObj(ref);
    path = descriptor.path;

    if (dest === undefined && descriptor.base) {
        if (idCache[descriptor.base] || idCache[descriptor.base + '#']) {
            cached = idCache[descriptor.base] || idCache[descriptor.base + '#'];
            dest = get(cached.resolver.resolve(cached.schema), path.slice(0));
        }
        else {
            path.unshift(descriptor.base);
        }
    }

    if (dest === undefined && this.resolvedRootSchema) {
        dest = get(this.resolvedRootSchema, path.slice(0));
    }

    if (dest === undefined) {
        dest = get(this.rootSchema, path.slice(0));
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