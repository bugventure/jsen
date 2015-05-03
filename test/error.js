'use strict';

var assert = require('assert'),
    jsen = require('../index.js');

describe('errors', function () {
    it('errors is empty array before validation', function () {
        var schema = { type: 'number' },
            validate = jsen(schema);

        assert(Array.isArray(validate.errors));
        assert.strictEqual(validate.errors.length, 0);
    });

    it('no errors on successful validation', function () {
        var schema = { type: 'number' },
            validate = jsen(schema),
            valid = validate(123);

        assert(valid);
        assert(Array.isArray(validate.errors));
        assert.strictEqual(validate.errors.length, 0);
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
        assert(Array.isArray(validate.errors));
        assert.strictEqual(validate.errors.length, 0);

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
                    ['a.b.c'],
                    ['a'],
                    ['b'],
                    ['b']
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
                    ['exclusiveMinimum'],
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

        it('adds required property name to path', function () {
            var schema = { type: 'object', required: ['a'] },
                validate = jsen(schema),
                valid = validate({});

            assert(!valid);
            assert.strictEqual(validate.errors.length, 1);
            assert.strictEqual(validate.errors[0].path, 'a');
            assert.strictEqual(validate.errors[0].keyword, 'required');

            schema = {
                type: 'object',
                properties: {
                    a: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['b']
                        }
                    }
                }
            };

            validate = jsen(schema);
            valid = validate({ a: [{}] });

            assert(!valid);
            assert.strictEqual(validate.errors.length, 1);
            assert.strictEqual(validate.errors[0].path, 'a.0.b');
            assert.strictEqual(validate.errors[0].keyword, 'required');
        });

        it('adds required dependency property to path', function () {
            var schema = {
                    type: 'object',
                    dependencies: {
                        a: ['b']
                    }
                },
                validate = jsen(schema),
                valid = validate({ a: 123 });

            assert(!valid);
            assert.strictEqual(validate.errors.length, 1);
            assert.strictEqual(validate.errors[0].path, 'b');
            assert.strictEqual(validate.errors[0].keyword, 'dependencies');

            schema = {
                type: 'object',
                properties: {
                    a: {
                        type: 'array',
                        items: {
                            type: 'object',
                            dependencies: {
                                a: ['b']
                            }
                        }
                    }
                }
            };

            validate = jsen(schema);
            valid = validate({ a: [{ a: 123 }] });

            assert(!valid);
            assert.strictEqual(validate.errors.length, 1);
            assert.strictEqual(validate.errors[0].path, 'a.0.b');
            assert.strictEqual(validate.errors[0].keyword, 'dependencies');
        });
    });

    describe('multiple errors', function () {
        var schema = {
                definitions: {
                    array: {
                        maxItems: 1
                    }
                },
                type: 'object',
                properties: {
                    a: {
                        anyOf: [
                            { items: { type: 'integer' } },
                            { $ref: '#/definitions/array' },
                            { items: [{ maximum: 3 }] }
                        ]
                    }
                }
            },
            data = { a: [Math.PI, Math.E] },
            validate = jsen(schema);

        it('returns multiple errors', function () {
            var valid = validate(data);

            // console.log(validate.errors);

            assert(!valid);
            assert.strictEqual(validate.errors.length, 5);
        });
    });

    describe('custom errors', function () {
        var schemas = [
                {
                    type: 'string',
                    invalidMessage: 'string is invalid',
                    requiredMessage: 'string is required'
                },
                {
                    type: 'object',
                    required: ['a'],
                    properties: {
                        a: {
                            invalidMessage: 'a is invalid',
                            requiredMessage: 'a is required'
                        }
                    }
                },
                {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            a: {
                                type: 'object',
                                properties: {
                                    b: {
                                        invalidMessage: 'b is invalid',
                                        requiredMessage: 'b is required'
                                    }
                                },
                                required: ['b']
                            }
                        }
                    }
                },
                {
                    type: 'object',
                    properties: {
                        a: {
                            type: 'object',
                            properties: {
                                c: {
                                    type: 'string',
                                    invalidMessage: 'c is invalid',
                                    requiredMessage: 'c is required'
                                }
                            }
                        }
                    }
                }
            ],
            data = [
                undefined,
                {},
                [{ a: {} }],
                { a: { c: 123 }}
            ],
            expectedMessages = [
                'string is invalid',
                'a is required',
                'b is required',
                'c is invalid'
            ],
            validate,
            valid;

        schemas.forEach(function (schema, index) {
            it (expectedMessages[index], function () {
                validate = jsen(schema);

                valid = validate(data[index]);

                assert(!valid);
                assert.strictEqual(validate.errors.length, 1);
                assert.strictEqual(validate.errors[0].message, expectedMessages[index]);
            });
        });
    });
});