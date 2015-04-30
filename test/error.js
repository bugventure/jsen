'use strict';

var assert = require('assert'),
    jsen = require('../index.js');

describe('errors', function () {
    it('errors is null before validation', function () {
        var schema = { type: 'number' },
            validate = jsen(schema);

        assert.strictEqual(validate.errors, null);
    });

    it('errors property cannot be overwritten', function () {
        var schema = { type: 'number' },
            validate = jsen(schema);

        validate.errors = 'overwritten';

        assert.strictEqual(validate.errors, null);
    });

    it('no errors on successful validation', function () {
        var schema = { type: 'number' },
            validate = jsen(schema),
            valid = validate(123);

        assert(valid);
        assert.strictEqual(validate.errors, null);
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
        assert.strictEqual(validate.errors, null);

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
});