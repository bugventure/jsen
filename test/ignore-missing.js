/* global describe, it */
'use strict';

var assert = assert || require('assert'),
    jsen = jsen || require('../index.js');

describe('missing $ref', function () {
    it('passes validation with ignore missing $ref', function () {
        var schema = {
                type: 'object',
                properties: {
                    test1: { $ref: '#external1'},   //missing
                    test2: {
                        type: 'object',
                        properties: {
                            test21: {$ref: '#external2'}    //missing
                        }
                    },
                    test3: { $ref: '#external3'}    //exist
                },
                additionalProperties: false
            },
            external3 = {
                type: 'object',
                properties: {
                    test31: { $ref: '#external31'}, //missing
                    test32: {
                        type: 'number'
                    },
                    test33: { $ref: '#external31'}  //duplicate
                }
            },
            validate = jsen(schema, {
                schemas: {
                    external3: external3
                },
                missing$Ref: true
            }),
            missingTest = {
                test1: 1,
                test2: {
                    test21: 21
                },
                test3: {
                    test31: 31,
                    test32: 32
                }
            },
            invalidTest = {
                test1: '1',
                test2: {
                    test21: 21
                },
                test3: {
                    test31: 31,
                    test32: '32',
                    test33: 33
                }
            },
            ret1 = validate(missingTest),
            ret2 = validate(invalidTest);

        assert(ret1);    // true
        assert(!ret2);   // !false
        assert.deepEqual(validate.missing, ['#external1', '#external2', '#external31']);
    });
});