JSEN 
=================

[![Build][travis-img]][travis-url] [![Coverage][coveralls-img]][coveralls-url] [![Downloads][downloads-img]][npm-url]

[![NPM][npm-img]][npm-url]

jsen (JSON Sentinel) validates your JSON objects using [JSON-Schema](http://json-schema.org/documentation.html).

### Table of Contents

<!-- MarkdownTOC -->

- [Getting Started](#getting-started)
- [Performance & Benchmarks](#performance--benchmarks)
- [JSON Schema](#json-schema)
- [Format Validation](#format-validation)
    - [Custom Formats](#custom-formats)
- [Errors](#errors)
    - [Custom Errors](#custom-errors)
- [Tests](#tests)
- [Issues](#issues)
- [Changelog](#changelog)
    - [v0.2.0](#v020)
    - [v0.1.2](#v012)
    - [v0.1.1](#v011)
    - [v0.1.0](#v010)
    - [v0.0.5](#v005)
    - [v0.0.4](#v004)
    - [v0.0.3](#v003)
- [License](#license)

<!-- /MarkdownTOC -->

## Getting Started

```bash
$ npm install jsen --save
```

```javascript
var jsen = require('jsen');
var validate = jsen({ type: 'string' });
var valid = validate('some value');
```

Validation works by passing a JSON schema to build a validator function that can be used to validate a JSON object.

The validator builder function (`jsen`) throws an error if the first parameter is not a schema object:

```javascript
try {
    // cannot use this string as a schema
    jsen('not a valid schema');
}
catch (e) {
    console.log(e);
}
```

`jsen` will not throw an error if the provided schema is not compatible with the [JSON-schema version 4 spec](http://json-schema.org/documentation.html). In this case, as per the spec, validation will always succeed for every schema keyword that is incorrectly defined.

```javascript

// this will not throw, but validation will be incorrect
var validate = jsen({ type: 'object', properties: ['string', 'number'] });

// validation erroneously passes, because keyword `properties` is ignored
var valid = validate({});   // true
```

If you need to validate your schema object, you can use a reference to the [JSON meta schema](http://json-schema.org/draft-04/schema). Internally, `jsen` will recognize and validate against the metaschema.

```javascript
var validateSchema = jsen({"$ref": "http://json-schema.org/draft-04/schema#"});
var isSchemaValid = validateSchema({ type: 'object' }); // true

isSchemaValid = validateSchema({ 
    type: 'object', 
    properties: ['string', 'number'] 
});
// false, because properties is not in correct format
```

## Performance & Benchmarks

JSEN uses dynamic code generation to produce a validator function that the V8 engine can optimize for performance. Following is a set of benchmarks where JSEN is compared to other JSON Schema validators for node.

* [json-schema-benchmark](https://github.com/ebdrup/json-schema-benchmark)
* [z-schema bencrhmark](https://rawgit.com/zaggino/z-schema/master/benchmark/results.html)
* [jsck benchmark](https://github.com/pandastrike/jsck)
* [themis benchmark](https://github.com/playlyfe/themis)
* [cosmicrealms.com benchmark](https://github.com/Sembiance/cosmicrealms.com)

More on V8 optimization: [Performance Tips for JavaScript in V8](http://www.html5rocks.com/en/tutorials/speed/v8/)

## JSON Schema

To get started with JSON Schema, check out the [JSEN schema guide](schema.md).

For further reading, check out this [excellent guide to JSON Schema](http://spacetelescope.github.io/understanding-json-schema/UnderstandingJSONSchema.pdf) by Michael Droettboom, et al.

JSEN fully implements draft 4 of the [JSON Schema specification](http://json-schema.org/documentation.html). 

## Format Validation

JSEN supports a few built-in formats, as defined by the [JSON Schema spec](http://json-schema.org/latest/json-schema-validation.html#anchor107):

* `date-time`
* `uri`
* `email`
* `ipv4`
* `ipv6` 
* `hostname`

These formats are validated against string values only. As per the spec, format validation passes successfully for any non-string value.

```javascript
var schema = { format: 'uri' },
    validate = jsen(schema);

validate('invalid/uri');    // false - format validation kicks in for strings
validate({});               // true - does not kick in for non-strings
```

### Custom Formats

JSEN additionally supports custom format validation. Custom formats are passed in `options.formats` as a second argument to the `jsen` validator builder function. 

```javascript
var schema = { format: 'uuid' },
    uuidRegex = '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-4[a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$',
    validate = jsen(schema, {
        formats: {
            uuid: uuidRegex
        }
    });

validate('fad2b4f5-bc3c-44ca-8e17-6d30cf62bdb1');   // true
validate('not-a-valid-UUID');                       // false
```

A custom format validator can be specified as:

* a regular expression `string`
* a regular expression `object`
* a `function (value, schema)` that must return a truthy value if validation passes

Unlike built-in format validators, custom format validators passed in the `options` are run for all data types, not only strings. This allows implementing custom validation behavior for arrays and objects in scenarios, where it is not possible or practical to use only JSON Schema keywords for validation rules.

Custom format validation runs after all built-in keyword validators. This means that an error in any previous keyword validator will stop execution and any custom format validators won't run.

## Errors

The validator function (the one called with the object to validate) provides an `errors` array containing all reported errors in a single validation run.

```javascript
var validate = jsen({ type: 'string' });

validate(123);      // false
console.log(validate.errors)
// Output: [{ path: '', keyword: 'type' }]

// path - deep (dot-delimited) path to the property that failed validation
// keyword - the JSON schema keyword that failed validation

validate('abc');    // true
// Output: []
```

The `errors` array may contain multiple errors from a single run.

```javascript
var validate = jsen({
    anyOf: [
        {
            type: 'object',
            properties: {
                tags: { type: 'array' }
            }
        },
        {
            type: 'object',
            properties: {
                comment: { minLength: 1 }
            }
        }
    ]
});

validate({ tags: null, comment: '' });

console.log(validate.errors);
/* Output:
[ { path: 'tags', keyword: 'type' },
  { path: 'comment', keyword: 'minLength' },
  { path: '', keyword: 'anyOf' } ]
*/
```

The errors array is replaced on every call of the validator function. You can safely modify the array without affecting successive validation runs.

### Custom Errors

You can define your custom error messages in the schema object through the `invalidMessage` and `requiredMessage` keywords.

```javascript
var schema = {
        type: 'object',
        properties: {
            username: {
                type: 'string',
                minLength: 5,
                invalidMessage: 'Invalid username',
                requiredMessage: 'Username is required'
            }
        },
        required: ['username']
    };
var validate = jsen(schema);

validate({});
console.log(validate.errors);
/* Output:
[ { path: 'username',
    keyword: 'required',
    message: 'Username is required' } ]
*/

validate({ username: '' });
console.log(validate.errors);
/* Output:
[ { path: 'username',
    keyword: 'minLength',
    message: 'Invalid username' } ]
*/
```

Custom error messages are assigned to error objects by path, meaning multiple failed JSON schema keywords on the same path will show the same custom error message.

```javascript
var schema = {
        type: 'object',
        properties: {
            age: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
                invalidMessage: 'Invalid age specified'
            }
        }
    };
var validate = jsen(schema);

validate({ age: 13.3 });
console.log(validate.errors);
/* Output:
[ { path: 'age',
    keyword: 'type',
    message: 'Invalid age specified' } ]
*/

validate({ age: -5 });
console.log(validate.errors);
/* Output:
[ { path: 'age',
    keyword: 'minimum',
    message: 'Invalid age specified' } ]
*/

validate({ age: 120 });
console.log(validate.errors);
/* Output:
[ { path: 'age',
    keyword: 'maximum',
    message: 'Invalid age specified' } ]
*/
```

The `requiredMessage` is assigned to errors coming from the `required` and `dependencies` keywords. For all other validation keywords, the `invalidMessage` is used.

## Tests

To run [mocha][mocha] tests:

```bash
$ npm test
```

`jsen` passes all draft 4 test cases specified by the [JSON-Schema-Test-Suite](https://github.com/json-schema/JSON-Schema-Test-Suite) with the exception of:

* Remote refs
* Zero-terminated floats
* Max/min length when using Unicode surrogate pairs

Source code coverage is provided by [istanbul][istanbul] and visible on [coveralls.io][coveralls-url].

## Issues

Please submit issues to the [jsen issue tracker in GitHub](https://github.com/bugventure/jsen/issues).

## Changelog

### v0.2.0

* Add support for custom format validators (#8, #9)
* Add support for validating javascipt Date objects (#17) 

### v0.1.2

* Fix cannot dereference schema when ids change resolution scope (#14)

### v0.1.1

* Fix broken inlining of regular expressions containing slashes (#15)
* Fix code generation breaks when object properties in schema are not valid identifiers (#16)

### v0.1.0

* Custom error messages defined in the schema
* Append the required property name to the path in the error object for `required` and `dependencies` keywords (#7) 
* Fix protocol-relative URIs are marked invalid (#13)
* Update [JSON-Schema-Test-Suite](https://github.com/json-schema/JSON-Schema-Test-Suite) tests (#12)

### v0.0.5

* Improve generated validation code (#4)
* Fail fast (#4)
* Error reporting (#5)
* Reduce the performance impact of logging validation errors (#4)

### v0.0.4

* Fix `multipleOf` doesn't validate data for decimal points (#1)

### v0.0.3

* Optimize performance of runtime code generation
* Optimize performance of generated code

## License

MIT 

[travis-url]: https://travis-ci.org/bugventure/jsen
[travis-img]: https://travis-ci.org/bugventure/jsen.svg?branch=master
[npm-url]: https://www.npmjs.org/package/jsen
[npm-img]: https://nodei.co/npm/jsen.png?downloads=true
[downloads-img]: http://img.shields.io/npm/dm/jsen.svg
[coveralls-img]: https://img.shields.io/coveralls/bugventure/jsen.svg
[coveralls-url]: https://coveralls.io/r/bugventure/jsen
[istanbul]: https://www.npmjs.org/package/istanbul
[mocha]: http://mochajs.org/