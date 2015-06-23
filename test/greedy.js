/* global describe, it */
'use strict';

var assert = assert || require('assert'),
    jsen = jsen || require('../index.js');

//describe('missing $ref', function () {
 //   it('passes validation with ignore missing $ref', function () {
        var schema = {
                type: 'object',
                properties: {
                    test1: {
                        type: 'string'
                    },
                    test2: {
                        type: 'object',
                        properties: {
                            test21: {
                                type: 'number'
                            }
                        }
                    },
                    test3: {
                       type: 'number'
                    },
                    test4: { $ref: '#external'}
                },
                additionalProperties: false
            },
            validate = jsen(schema, {
                greedyValidate: true,
                schemas: {
                    external: {
                        type: 'string'
                    }
                }
            }),
            invalidTest = {
                test1: 1,
                test2: '2',
                test3: 'j',
                test4: 4
            },
            ret = validate(invalidTest, true);

console.log(ret);
console.log(validate);
//        assert(ret1);    // true
//        assert(!ret2);   // !false
//        assert.deepEqual(validate.missing, ['#external1', '#external2', '#external31']);
//    });
//});