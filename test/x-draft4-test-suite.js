/* global describe, it */
'use strict';

var fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    jsen = require('../index.js'),
    dir = 'draft4',
    files,
    testCategories = [],
    error,
    excludedFiles = [
        'refRemote',
        'zeroTerminatedFloats'
    ],
    excludedCases = [
        'two supplementary Unicode code points is long enough',
        'one supplementary Unicode code point is not long enough'
    ];

function walk(dir) {
    files = fs.readdirSync(dir);

    files.forEach(function (filename) {
        var fullpath = path.resolve(dir, filename),
            stat = fs.statSync(fullpath);

        if (stat.isFile() && path.extname(filename) === '.json' &&
            excludedFiles.indexOf(path.basename(filename, '.json')) < 0) {
            testCategories.push({
                name: path.basename(filename, '.json'),
                testGroups: require(fullpath)
            });
        }
        else if (stat.isDirectory()) {
            walk(path.resolve(dir, filename));
        }
    });
}

try {
    walk(path.resolve(__dirname, dir));
}
catch (e) {
    error = e;
}

function addTestCase(schema, testCase) {
    if (excludedCases.indexOf(testCase.description) > -1) {
        return;
    }

    it(testCase.description, function () {
        var prejson = JSON.stringify(schema);

        assert.strictEqual(jsen(schema)(testCase.data), testCase.valid);

        assert.strictEqual(JSON.stringify(schema), prejson,
            'validator does not modify original JSON');
    });
}

function addTestGroup(testGroup) {
    describe(testGroup.description, function () {
        testGroup.tests.forEach(addTestCase.bind(null, testGroup.schema));
    });
}

function addTestCategory(testCategory) {
    describe(testCategory.name, function () {
        testCategory.testGroups.forEach(addTestGroup);
    });
}

describe('JSON-schema test suite', function () {
    if (error) {
        it('error', function () {
            assert.fail(error.message);
        });
    }
    else {
        testCategories.forEach(addTestCategory);
    }
});