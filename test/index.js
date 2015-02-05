'use strict';

var assert = require('assert'),
    jsen = require('../index.js');

describe('jsen', function () {
    it('is a function', function () {
        assert(typeof jsen === 'function');
    });

    it('throws if schema is not an object', function () {
        assert.throws(function () { jsen(); });
        assert.throws(function () { jsen(null); });
        assert.throws(function () { jsen(false); });
        assert.throws(function () { jsen(123); });
        assert.throws(function () { jsen('abc'); });
        assert.throws(function () { jsen([]); });
        assert.doesNotThrow(function () { jsen({}); });
    });

    it('produces a function', function () {
        var validate = jsen({});
        assert(typeof validate === 'function');
        assert(validate() === true);
        assert(validate.error === null);
    });
});