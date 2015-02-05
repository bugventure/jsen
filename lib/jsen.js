'use strict';
var util = require('util'),
    func = require('./func.js'),
    type = require('./type.js'),
    strings = require('./strings.js'),
    SchemaResolver = require('./resolver.js');

module.exports = function validator(schema) {
    if (!type.isObject(schema)) {
        throw new Error(strings.invalidSchema);
    }

    var builder = func('data'),
        resolver = new SchemaResolver(schema),
        compiled;

    compiled = builder.compile({
        schema: schema,
        resolver: resolver
    });

    return compiled;
};