'use strict';

var assert = require('assert'),
    jsen = require('../index.js');

describe('errors', function () {
    it('errors is null before validation', function () {
        var schema = { type: 'number' },
            validate = jsen(schema);

        assert.strictEqual(validate.errors, null);
    });

    it('errors property cannot be overwritten', function () {
        var schema = { type: 'number' },
            validate = jsen(schema);

        validate.errors = 'overwritten';

        assert.strictEqual(validate.errors, null);
    });

    it('no errors on successful validation', function () {
        var schema = { type: 'number' },
            validate = jsen(schema),
            valid = validate(123);

        assert(valid);
        assert.strictEqual(validate.errors, null);
    });

    it('has errors when validation unsuccessful', function () {
        var schema = { type: 'number' },
            validate = jsen(schema),
            valid = validate('123');

        assert(!valid);
        assert(Array.isArray(validate.errors));
        assert.strictEqual(validate.errors.length, 1);
    });

    it('clears errors on successive validation calls', function () {
        var schema = { type: 'number' },
            validate = jsen(schema);

        validate('123');
        assert(Array.isArray(validate.errors));
        assert.strictEqual(validate.errors.length, 1);

        validate(123);
        assert.strictEqual(validate.errors, null);

        validate('123');
        assert(Array.isArray(validate.errors));
        assert.strictEqual(validate.errors.length, 1);
    });

    it('two successive runs return different arrays', function () {
        var schema = { type: 'number' },
            validate = jsen(schema),
            previous;

        validate('123');
        assert.strictEqual(validate.errors.length, 1);
        previous = validate.errors;

        validate('123');
        assert.strictEqual(validate.errors.length, 1);

        assert.notStrictEqual(validate.errors, previous);
        assert.deepEqual(validate.errors, previous);
    });

    describe('error object', function () {
        var schemas = [
                {
                    type: 'number'
                },

                {
                    type: 'object',
                    properties: {
                        a: {
                            type: 'string'
                        }
                    }
                },

                {
                    type: 'array',
                    uniqueItems: true
                },

                {
                    type: 'array',
                    items: {
                        maximum: 10
                    }
                },

                {
                    type: 'object',
                    properties: {
                        a: {
                            type: 'array',
                            items: [{
                                type: 'object',
                                properties: {
                                    b: {
                                        multipleOf: 7
                                    }
                                }
                            }]
                        }
                    }
                },

                {
                    allOf: [
                        { minimum: 5 },
                        { maximum: 10 }
                    ]
                },

                {
                    type: 'object',
                    properties: {
                        a: {
                            anyOf: [
                                { type: 'string' },
                                { type: 'number' }
                            ]
                        }
                    }
                },

                {
                    type: 'array',
                    items: [{
                        type: 'object',
                        properties: {
                            a: {
                                oneOf: [
                                    { type: 'boolean' },
                                    { type: 'null' }
                                ]
                            }
                        }
                    }]
                },

                {
                    type: 'object',
                    properties: {
                        a: {
                            not: {
                                type: 'string'
                            }
                        }
                    }
                },

                {
                    definitions: {
                        positiveInteger: {
                            type: 'integer',
                            minimum: 0,
                            exclusiveMinimum: true
                        }
                    },
                    type: 'object',
                    properties: {
                        a: {
                            type: 'object',
                            properties: {
                                b: {
                                    type: 'object',
                                    properties: {
                                        c: {
                                            $ref: '#/definitions/positiveInteger'
                                        }
                                    }
                                }
                            }
                        }
                    }
                },

                {
                    type: 'object',
                    required: ['a', 'b']
                },

                {
                    type: 'object',
                    dependencies: {
                        a: {
                            required: ['b']
                        }
                    }
                },

                {
                    type: 'object',
                    dependencies: {
                        a: ['b']
                    }
                }
            ],
            data = [
                '123',
                { a: 123 },
                [7, 11, 7],
                [10, 11, 9],
                { a: [{ b: 8 }] },
                12,
                { a: false },
                [{ a: 123 }],
                { a: 'abc' },
                { a: { b: { c: 0 }}},
                {},
                { a: 123 },
                { a: 123 }
            ];

        it ('property: path', function () {
            var expectedPaths = [
                    [''],
                    ['a'],
                    [''],
                    ['1'],
                    ['a.0.b'],
                    [''],
                    ['a', 'a'],
                    ['0.a', '0.a', '0.a'],
                    ['a'],
                    ['', 'a.b.c'],
                    [''],
                    [''],
                    ['']
                ],
                validate, valid;

            schemas.forEach(function (schema, index) {
                validate = jsen(schema);
                valid = validate(data[index]);

                assert(!valid);

                expectedPaths[index].forEach(function (path, pindex) {
                    try {
                        assert.strictEqual(validate.errors[pindex].path, path);
                    }
                    catch (e) {
                        // console.log(index);
                        // console.log(validate.errors);
                        throw e;
                    }
                });
            });
        });

        it ('property: keyword', function () {
            var expectedKeywords = [
                    ['type'],
                    ['type'],
                    ['uniqueItems'],
                    ['maximum'],
                    ['multipleOf'],
                    ['maximum'],
                    ['type', 'type', 'anyOf'],
                    ['type', 'type', 'oneOf'],
                    ['not'],
                    ['exclusiveMinimum', '$ref'],
                    ['required'],
                    ['required'],
                    ['dependencies']
                ],
                validate, valid;

            schemas.forEach(function (schema, index) {
                validate = jsen(schema);
                valid = validate(data[index]);

                assert(!valid);

                expectedKeywords[index].forEach(function (keyword, kindex) {
                    try {
                        assert.strictEqual(validate.errors[kindex].keyword, keyword);
                    }
                    catch (e) {
                        // console.log(index);
                        // console.log(validate.errors);
                        throw e;
                    }
                });
            });
        });
    });

    describe('multiple errors', function () {
        it('returns multiple errors');
        it('error objects are sorted by increasing path');
    });
});