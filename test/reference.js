/* global describe, it */
'use strict';

var assert = assert || require('assert'),
    jsen = jsen || require('../index.js');

// Reference: https://tools.ietf.org/html/rfc6901
describe('JSON Pointer', function () {
    var doc = {
            foo: ['bar', 'baz'],
            '': 0,
            'a/b': 1,
            'c%d': 2,
            'e^f': 3,
            'g|h': 4,
            'i\\j': 5,
            'k\"l': 6,
            ' ': 7,
            'm~n': 8,
            'k\'l': 9
        },
        expected = [doc, doc.foo, 'bar', 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
        i;

    it('resolver conforms to JSON Pointer spec', function () {
        var paths = [
            '',
            '/foo',
            '/foo/0',
            '/',
            '/a~1b',
            '/c%d',
            '/e^f',
            '/g|h',
            '/i\\j',
            '/k\"l',
            '/ ',
            '/m~0n',
            '/k\'l'
        ];

        for (i = 0; i < paths.length; i++) {
            assert.strictEqual(expected[i], jsen.resolve(doc, paths[i]));
        }
    });

    it('decodes URI-encoded pointers', function () {
        var paths = [
            '#',
            '#/foo',
            '#/foo/0',
            '#/',
            '#/a~1b',
            '#/c%25d',
            '#/e%5Ef',
            '#/g%7Ch',
            '#/i%5Cj',
            '#/k%22l',
            '#/%20',
            '#/m~0n',
            '#/k\'l'
        ];

        for (i = 0; i < paths.length; i++) {
            assert.strictEqual(expected[i], jsen.resolve(doc, paths[i]));
        }
    });
});

describe('$ref', function () {
    it('throws if string is not in correct format', function () {
        assert.throws(function () {
            jsen({ $ref: '' });
        });

        assert.throws(function () {
            jsen({ $ref: '#double//slash' });
        });

        assert.throws(function () {
            jsen({ $ref: '#ends/with/slash/' });
        });

        assert.throws(function () {
            // invalid reference, non-existent schema properties
            jsen({ $ref: '#a/b/c' });
        });

        assert.doesNotThrow(function () {
            // schema resolves to itself
            jsen({ $ref: '#' });
        });

        assert.doesNotThrow(function () {
            jsen({
                a: {
                    b: {
                        c: {
                            type: 'any'
                        }
                    }
                },
                $ref: '#/a/b/c'
            });
        });

        assert.doesNotThrow(function () {
            jsen({
                arr: [
                    { value: { type: 'string'} },
                    { value: { type: 'number'} },
                    { value: { type: 'boolean'} }
                ],
                type: 'object',
                properties: {
                    a: { $ref: '#arr/2/value' }
                }
            });
        });
    });

    describe('external schema', function () {
        it('finds external schema with a hash', function () {
            var external = { type: 'string' },
                schema = { $ref: '#external' },
                validate = jsen(schema, {
                    schemas: {
                        external: external
                    }
                });

            assert(validate('abc'));
            assert(!validate(123));
        });

        it('finds external schema without a hash', function () {
            var external = { type: 'string' },
                schema = { $ref: 'external' },
                validate = jsen(schema, {
                    schemas: {
                        external: external
                    }
                });

            assert(validate('abc'));
            assert(!validate(123));
        });

        it('throws when no external schema found', function () {
            var schema = { $ref: '#external' };

            assert.throws(function () {
                jsen(schema);
            });
        });

        it('own property takes precendence over external schema', function () {
            var external = { type: 'string' },
                schema = {
                    external: { type: 'number' },
                    $ref: '#external'
                },
                validate = jsen(schema, {
                    schemas: {
                        external: external
                    }
                });

            assert(!validate('abc'));
            assert(validate(123));
        });

        it('external schemas have their own dereferencing scope', function () {
            var external = {
                    inner: { type: 'string' },
                    $ref: '#inner'
                },
                schema = {
                    inner: { type: 'number' },
                    $ref: '#external'
                },
                validate = jsen(schema, {
                    schemas: {
                        external: external
                    }
                });

            assert(validate('abc'));
            assert(!validate(123));
        });
    });
});