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
});