'use strict';

var assert = assert || require('assert'),
    jsen = jsen || require('../index.js');

describe('fixes', function () {
    it('Fix broken inlining of regular expressions containing slashes (#15, #25)', function () {
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

    it('Fix cannot dereference schema when ids change resolution scope (#14)', function () {
        var schema = {
                $ref: '#child',
                definitions: {
                    child: {
                        id: '#child',
                        type: 'string'
                    }
                }
            },
            validate;

        assert.doesNotThrow(function () {
            validate = jsen(schema);
        });

        assert(validate('abc'));
        assert(!validate(123));

        schema = {
            $ref: '#child/definitions/subchild',
            definitions: {
                child: {
                    id: '#child',
                    definitions: {
                        subchild: {
                            type: 'number'
                        }
                    }
                }
            }
        };

        assert.throws(function () {
            // cannot dereference a URI, part of which is an ID
            validate = jsen(schema);
        });
    });
});