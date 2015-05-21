'use strict';

var assert = require('assert'),
    jsen = require('../index.js');

describe('build', function () {
    it('validator function has a build property', function () {
        var validate = jsen({});

        assert(typeof validate.build === 'function');
        assert.strictEqual(validate.build.length, 2);
    });

    it('returns default value from schema if initial undefined', function () {
        var validate = jsen({ type: 'string', default: 'abc' });

        assert.strictEqual(validate.build(), 'abc');
        assert.strictEqual(validate.build(undefined), 'abc');
    });

    it('does not modify initial defined value', function () {
        var validate = jsen({ type: 'string', default: 'abc' }),
            initials = [
                null,
                '',
                'string value',
                true,
                false,
                123,
                Math.PI,
                {},
                [],
                new Date()
            ],
            obj;

        initials.forEach(function (initial) {
            obj = validate.build(initial);
            assert.strictEqual(obj, initial);
        });
    });

    it('returns initial if no default in schema', function () {
        var validate = jsen({}),
            initials = [
                undefined,
                null,
                '',
                'string value',
                true,
                false,
                123,
                Math.PI,
                {},
                [],
                new Date()
            ],
            obj;

        initials.forEach(function (initial) {
            obj = validate.build(initial);

            assert.strictEqual(obj, initial);
        });
    });

    it('returns the default value specified in schema', function () {
        var schemas = [
                { default: null },
                { default: undefined },
                { default: '' },
                { default: 'abc' },
                { default: true },
                { default: false },
                { default: 123 },
                { default: Math.PI }
            ],
            validate;

        schemas.forEach(function (schema) {
            validate = jsen(schema);
            assert.strictEqual(validate.build(), schema.default);
        });
    });

    it('returns a copy of a default object or array in schema', function () {
        var schemas = [
                { default: { a: { b: 123 } } },
                { default: [[1, 2, 3], { a: { b: 123 } }] },
                { default: /\d+/ },
                { default: new Date('05/14/2015') }
            ],
            validate,
            def;

        schemas.forEach(function (schema) {
            validate = jsen(schema);
            def = validate.build();

            assert.notStrictEqual(def, schema.default);
            assert.deepEqual(def, schema.default);
        });
    });

    it('recursively collects default values', function () {
        var schema = {
                type: 'object',
                default: {},
                properties: {
                    a: {
                        type: 'array',
                        default: [],
                        items: {
                            type: 'string'
                        }
                    },
                    b: {
                        type: 'array',
                        default: [],
                        items: {
                            type: 'string',
                            default: 'abc'
                        }
                    },
                    c: {
                        type: 'object',
                        default: {},
                        properties: {
                            d: {
                                type: 'boolean',
                                default: false
                            },
                            e: {
                                type: 'date',
                                default: new Date('05/14/2015')
                            },
                            f: {
                                type: 'array',
                                default: [{}, {}],
                                items: [{
                                    type: 'object',
                                    properties: {
                                        g: {
                                            type: 'string',
                                            default: 'yes'
                                        }
                                    }
                                }, {
                                    type: 'object',
                                    properties: {
                                        g: {
                                            type: 'integer',
                                            default: 0
                                        }
                                    }
                                }, {
                                    type: 'object',
                                    properties: {
                                        g: {
                                            type: 'boolean',
                                            default: true
                                        }
                                    }
                                }]
                            },
                            h: {
                                type: 'array',
                                default: [{}, {}],
                                items: {
                                    type: 'object',
                                    properties: {
                                        i: {
                                            type: 'object',
                                            default: { foo: 'bar' }
                                        }
                                    }
                                }
                            },
                            i: {
                                type: 'object',
                                default: null,
                                properties: {
                                    j: {
                                        type: 'string',
                                        default: 'baz'
                                    }
                                }
                            }
                        }
                    },
                    j: {
                        type: 'object',
                        properties: {
                            k: {
                                type: 'boolean',
                                default: false
                            }
                        }
                    }
                }
            },
            expected = {
                a: [],
                b: [],
                c: {
                    d: false,
                    e: new Date('05/14/2015'),
                    f: [
                        { g: 'yes' },
                        { g: 0 }
                    ],
                    h: [
                        { i: { foo: 'bar' } },
                        { i: { foo: 'bar' } }
                    ],
                    i: null
                }
            },
            validate = jsen(schema);

        assert.deepEqual(validate.build(), expected);
    });

    it('merges default values with the initial values', function () {
        var schemas = [
                {
                    properties: {
                        foo: { default: 'bar' }
                    }
                },
                {
                    properties: {
                        foo: { default: 'bar' }
                    }
                },
                {
                    properties: {
                        foo: { default: 'bar' }
                    }
                },
                {
                    items: {
                        properties: {
                            foo: { default: 'bar' }
                        }
                    }
                },
                {
                    items: {
                        properties: {
                            foo: { default: 'bar' }
                        }
                    }
                },
                {
                    items: [
                        { default: 'foo' },
                        { default: 'bar' },
                        { default: 'baz' }
                    ]
                },
                {
                    items: [
                        { default: 'foo' },
                        { default: 'bar' },
                        { default: 'baz' }
                    ]
                }
            ],
            defaults = [
                {},
                { foo: 'baz' },
                { x: 'yz' },
                [],
                [{}],
                [],
                [null, {}, undefined, false]
            ],
            expected = [
                { foo: 'bar' },
                { foo: 'baz' },
                { foo: 'bar', x: 'yz' },
                [],
                [{ foo: 'bar' }],
                ['foo', 'bar', 'baz'],
                [null, {}, 'baz', false]
            ],
            validate;

        schemas.forEach(function (schema, index) {
            validate = jsen(schema);

            assert.deepEqual(validate.build(defaults[index]), expected[index]);
        });
    });

    describe('object', function () {
        it('clones default object and subproperties recursively', function () {
            var schema = {
                    default: {},
                    properties: {
                        foo: {
                            type: 'string',
                            default: 'bar'
                        }
                    }
                },
                expected = { foo: 'bar' },
                validate = jsen(schema);

            assert.deepEqual(validate.build(), expected);
        });

        it('does not recursively assign defaults of children if parent default is not an object', function () {
            var schema = {
                    default: [],
                    properties: {
                        foo: {
                            type: 'string',
                            default: 'bar'
                        }
                    }
                },
                expected = [],
                validate = jsen(schema);

            assert.deepEqual(validate.build(), expected);
        });
    });

    describe('array', function () {
        it('does not add new elements to default array: items schema is an object', function () {
            var schema = {
                    default: [],
                    items: {
                        type: 'string',
                        default: 'bar'
                    }
                },
                expected = [],
                validate = jsen(schema);

            assert.deepEqual(validate.build(), expected);
        });

        it('adds new elements to default array: items schema is an array', function () {
            var schema = {
                    default: [],
                    items: [{
                        type: 'string',
                        default: 'bar'
                    }]
                },
                expected = ['bar'],
                validate = jsen(schema);

            assert.deepEqual(validate.build(), expected);
        });

        it('adds default values to already existing child items of compatible type only: items schema is an object', function () {
            var schema = {
                    default: [{}, null, []],
                    items: {
                        properties: {
                            foo: {
                                type: 'string',
                                default: 'bar'
                            }
                        }
                    }
                },
                expected = [{ foo: 'bar' }, null, []],
                validate = jsen(schema);

            assert.deepEqual(validate.build(), expected);
        });

        it('adds default values to already existing child items of compatible type only: items schema is an array', function () {
            var schema = {
                    default: [{}, null, {}, undefined],
                    items:[
                        {
                            properties: {
                                foo: {
                                    type: 'string',
                                    default: 'bar'
                                }
                            }
                        },
                        { default: 'abc' },
                        { default: 123 },
                        { default: 123 }
                    ]
                },
                expected = [{ foo: 'bar' }, null, {}, 123],
                validate = jsen(schema);

            assert.deepEqual(validate.build(), expected);
        });

        it('does not assign default child items if parent default is not an array', function () {
            var schema = {
                    default: 'foobar',
                    items: {
                        type: 'string',
                        default: 'bar'
                    }
                },
                expected = 'foobar',
                validate = jsen(schema);

            assert.deepEqual(validate.build(), expected);
        });
    });

    describe('option: copy', function () {
        it('returns deep copy of the initial object by default');
        it('modifies the initial object when copy = false');
    });

    describe('option: additionalProperties', function () {
        it('includes additional properties by default');
        it('excludes additional properties from returned object when additionalProperties = false');
        it('removes additional properties from the initial object when additionalProperties = false and copy = false');
    });
});