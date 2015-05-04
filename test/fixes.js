'use strict';

var assert = require('assert'),
    jsen = require('../index.js');

describe('fixes', function () {
    it('Fix broken inlining of regular expressions containing slashes (#15)', function () {
        var schema = {
            type: 'string',
            pattern: '^/dev/[^/]+(/[^/]+)*$'
        };

        assert.doesNotThrow(function () {
            jsen(schema);
        });
    });
});