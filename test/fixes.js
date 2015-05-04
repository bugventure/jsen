'use strict';

var assert = require('assert'),
    jsen = require('../index.js');

describe('fixes', function () {
    it('Fix broken inlining of regular expressions containing slashes (#15)', function () {
        var schema = {
            type: 'string',
            pattern: '^/dev/[^/]+(/[^/]+)*$'
        };

        assert.doesNotThrow(function () {
            jsen(schema);
        });
    });

    it('Fix code generation breaks when object properties in schema are not valid identifiers (#16)', function () {
        var schema = {
                type: 'object',
                properties: {
                    123: {
                        type: 'boolean'
                    }
                }
            },
            validate;

        assert.doesNotThrow(function () {
            validate = jsen(schema);
        });

        assert(validate({ 123: true }));
    });
});