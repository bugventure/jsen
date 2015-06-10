/* global describe, it */
'use strict';

var assert = assert || require('assert'),
    jsen = jsen || require('../index.js');

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