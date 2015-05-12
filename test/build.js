'use strict';

var assert = require('assert'),
    jsen = require('../index.js');

describe.skip('build', function () {
    it('validator function has a build property', function () {
        var validate = jsen({});

        assert(typeof validate.build === 'function');
        assert.strictEqual(validate.build.length, 2);
    });

    it('returns default value from schema if no initial specified', function () {
        var validate = jsen({ type: 'string', default: 'abc' }),
            obj = validate.build();

        assert.strictEqual(obj, 'abc');
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
            obj = validate.build(obj);
            assert.strictEqual(obj, initial);
        });
    });

    it('recursively collects default values');
    it('merges default values with the initial values');

    describe('option: instantiate', function () {
        it('does not instantiate objects and arrays by default');
        it('instantiates objects and arrays when instantiate = true');
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