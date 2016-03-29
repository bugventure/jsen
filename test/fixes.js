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

    it('Fix broken inlining of regular expressions containing slashes 2 (#46)', function () {
        var schema = {
            type: 'string',
            pattern: '^(/[^/ ]*)+/?$'
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

    it('Fix recursive calls to the same cached $ref validator resets the error object', function () {
        var schema = {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        foo: { $ref: '#' }
                    },
                    required: ['foo']
                }
            },
            validate = jsen(schema);

        assert(validate([{ foo: [] }]));
        assert(validate([{ foo: [{ foo: [] }] }]));
        assert(!validate([{ bar: [] }]));
        assert(!validate([{ foo: [{ foo: [] }, { bar: [] }] }]));   // Bug! False positive
    });

    it('Fix cannot build validator function with nested refs (#48, #50)', function () {
        assert.doesNotThrow(function () {
            jsen({
                a: {
                    properties: {
                        b: {
                            $ref: '#/c'
                        }
                    }
                },
                c: {
                    type: 'any'
                },
                $ref: '#/a'
            });
        });
    });

    it('Fix build() doesn\'t work with allOf (#40)', function () {
        var schemaA = {
                $schema: 'http://json-schema.org/draft-04/schema#',
                id: 'http://jsen.bis/schemaA',
                type: 'object',
                properties: {
                    firstName: { type: 'string' },
                    lastName: { type: 'string'}
                },
                required: ['firstName', 'lastName']
            },
            schemaB = {
                $schema: 'http://json-schema.org/draft-04/schema#',
                id: 'http://jsen.bis/schemaB',
                type: 'object',
                properties: {
                    email: { type: 'string' },
                    contactType: { type: 'string', default: 'personal' }
                },
                required: ['email']
            },
            mySchema = {
                $schema: 'http://json-schema.org/draft-04/schema#',
                id: 'http://jsen.biz/mySchema',
                type: 'object',
                allOf: [
                    { $ref: 'http://jsen.bis/schemaA' },
                    { $ref: 'http://jsen.bis/schemaB' }
                ]
            },
            baseSchemas = {
                'http://jsen.bis/schemaA': schemaA,
                'http://jsen.bis/schemaB': schemaB
            },
            data = {
                firstName: 'bunk',
                lastName: 'junk',
                email: 'asdf@biz',
                funky: true
            },
            validator = jsen(mySchema, { schemas: baseSchemas, greedy: true });

        assert(validator(data));

        validator.build(data, { additionalProperties: false, copy: false });

        assert.deepEqual(data, {
            firstName: 'bunk',
            lastName: 'junk',
            email: 'asdf@biz',
            contactType: 'personal'
        });
    });
});