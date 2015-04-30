/* global describe, it */
'use strict';

var assert = require('assert'),
    jsen = require('../index.js');

describe('errors', function () {
    it('should throw an error on invalid input if asked', function () {
        var schema = { type: 'number' },
            validate = jsen(schema, true);

        var errorMatcher = /Invalid input/;
        assert.throws(function(){validate()}, errorMatcher);
        assert.throws(function(){validate('invalid'), errorMatcher});

        assert(validate(123));
    });
});
