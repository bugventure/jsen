/* global describe, it */
'use strict';

var dir = '../node_modules/json-schema-test-suite/tests/draft4',
    assert = assert || require('assert'),
    jsen = jsen || require('../index.js'),
    path = jsen.browser ? null : require('path'),
    fs = jsen.browser ? null : require('fs'),
    testDir = jsen.browser ? dir + '/' : path.resolve(__dirname, dir),
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
    ],
    walk;

if (jsen.browser) {
    walk = function (dir) {
        var specs = [
                'optional/bignum',
                'optional/format',
                'additionalItems',
                'additionalProperties',
                'allOf',
                'anyOf',
                'default',
                'definitions',
                'dependencies',
                'enum',
                'items',
                'maxItems',
                'maxLength',
                'maxProperties',
                'maximum',
                'minItems',
                'minLength',
                'minProperties',
                'minimum',
                'multipleOf',
                'not',
                'oneOf',
                'pattern',
                'patternProperties',
                'properties',
                'ref',
                'required',
                'type',
                'uniqueItems'
            ],
            xhr, spec;

        while (specs.length) {
            spec = specs.shift();

            xhr = new XMLHttpRequest();     // jshint ignore: line

            xhr.onload = function () {
                testCategories.push({
                    name: spec,
                    testGroups: JSON.parse(this.responseText)
                });
            };                              // jshint ignore: line

            xhr.open('GET', dir + spec + '.json', false);

            xhr.send(null);
        }

    };
}
else {
    walk = function (dir) {
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
    };
}

try {
    walk(testDir);
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