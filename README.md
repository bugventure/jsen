JSEN 
=================

[![Build][travis-img]][travis-url] [![Coverage][coveralls-img]][coveralls-url] [![Downloads][downloads-img]][npm-url]

[![NPM][npm-img]][npm-url]

jsen (JSON Sentinel) validates your JSON objects using [JSON-Schema](http://json-schema.org/documentation.html).

### Table of Contents

<!-- MarkdownTOC -->

- [Getting Started](#getting-started)
- [JSON Schema](#json-schema)
- [Type Validation](#type-validation)
    - [`string`](#string)
    - [`number`](#number)
    - [`integer`](#integer)
    - [`boolean`](#boolean)
    - [`object`](#object)
    - [`array`](#array)
    - [`null`](#null)
    - [`any`](#any)
- [Multi Schema Validation & Negation](#multi-schema-validation--negation)
    - [`allOf`](#allof)
    - [`anyOf`](#anyof)
    - [`oneOf`](#oneof)
    - [`not`](#not)
- [Schema Reference Using `$ref`](#schema-reference-using-ref)
- [Errors](#errors)
- [Tests](#tests)
- [Issues](#issues)
- [Changelog](#changelog)
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

## JSON Schema

`jsen` fully implements draft 4 of the [JSON Schema specification](http://json-schema.org/documentation.html). Check out this [excellent guide to JSON Schema](http://spacetelescope.github.io/understanding-json-schema/UnderstandingJSONSchema.pdf) by Michael Droettboom, et al.

A schema is a JavaScript object that specifies the type and structure of another JavaScript object or value. Here are some valid schema objects:

Schema | Matches
------ | -------
`{}` | any value
`{ type: 'string' }` | a JavaScript string
`{ type: 'number' } ` | a JavaScript number
`{ type: ['string', 'null'] }` | either a string or `null`
`{ type: 'object' }` | a JavaScript object
`{ type: 'array', items: { type: 'string' } }` | an array containing strings

## Type Validation

### `string`

```javascript
{
    type: 'string',     // match a string
    minLength: 3,       // with minimum length 3 characters
    maxLength: 10,      // with maximum length 10 character
    pattern: '^\\w$'    // matching the regex /^\w$/
}
```


### `number`

```javascript
{
    type: 'number',         // match a number
    minimum: 0,             // with minimum value 0
    maximum: 10,            // with maximum value 10
    exclusiveMinimum: true, // exclude the min value (default: false)
    exclusiveMaximum: true, // exclude the max value (default: false)
    multipleOf: 2           // the number must be a multiple of 2
}
```

### `integer`

Same as `number`, but matches integers only.

```javascript
{
    type: 'integer',        // match an integer number
    minimum: 0,             // with minimum value 0
    maximum: 10,            // with maximum value 10
    exclusiveMinimum: true, // exclude the min value (default: false)
    exclusiveMaximum: true, // exclude the max value (default: false)
    multipleOf: 2           // the number must be a multiple of 2
}
```

### `boolean`

```javascript
{
    type: 'boolean'     // match a Boolean value
}
```

### `object`

```javascript
{
    type: 'object',                     // match a JavaScript object
    minProperties: 2,                   // having at least 2 properties
    maxProperties: 5,                   // and at most 5 properties
    required: ['id', 'name'],           // where `id` and `name` are required
    properties: {                       // and the properties are as follows
        id: { type: 'string' },
        name: { type: 'string' },
        price: { 
            type: 'number',
            mininum: 0
        },
        available: { type: 'boolean' }
    },
    patternProperties: {                // with additional properties, where
        '^unit-\w+$': {                 // the keys match the given regular
            type: 'number',             // expression and the values are
            minimum: 0                  // numbers with minimum value of 0
        }                               
    },
    additionalProperties: false         // do not allow any other properties
}                                       // (default: true)
```

Alternatively `additionalProperties` can be an object defining a schema, where each additional property must conform to the specified schema.

```javascript
{
    type: 'object',             // match a JavaScript object
    additionalProperties: {     // with all properties containing
        type: 'string'          // string values
    }
}
```

You can additionally specify `dependencies` in an object schema. There are two types of dependencies:

1. property dependency

    ```javascript
    {
        type: 'object',             // if `price` is defined, then
        dependencies: {             // these two must also be defined
            price: ['unitsInStock', 'quantityPerUnit']
        }
    }
    ```

2. schema dependency
    
    ``` javascript
    {
        type: 'object',
        dependencies: {                     // if `price` is defined,
            price: {                        // then the object must also
                type: 'object',             // match the specified schema
                properties: {
                    unitsInStock: {
                        type: 'integer',
                        minimum: 0
                    }
                }
            }
        }
    }
    ```

### `array`

```javascript
{
    type: 'array',          // match a JavaScript array
    minItems: 1,            // with minimum 1 item
    maxItems: 5,            // and maximum 5 items
    uniqueItems: true,      // where items are unique
    items: {                // and each item is a number
        type: 'number'
    }
}
```

Alternatively, you can specify multiple item schemas for positional matching.

```javascript
{
    type: 'array',              // match a JavaScript array
    items: [                    // containing exactly 3 items
        { type: 'string' },     // where first item is a string
        { type: 'number' },     // and second item is a number
        { type: 'boolean' }     // and third item is a Boolean value
    ]
}
```

### `null`

```javascript
{
    type: 'null'    // match a null value
}
```

### `any`

```javascript
{
    type: 'any'     // equivalent to `{}` (matches any value)
}
```

## Multi Schema Validation & Negation

### `allOf`

```javascript
{
    allOf: [                    // match a number conforming to both schemas,
        {                       // i.e. a numeric value between 3 and 5
            type: 'number',
            minimum: 0,
            maximum: 5
        },
        { 
            type: 'number',
            minimum: 3,
            maximum: 10
        }
    ]
}
```

### `anyOf`

```javascript
{
    anyOf: [                    // match either a string or a number
        { type: 'string' },
        { type: 'number' }
    ]
}
```

### `oneOf`

```javascript
{
    oneOf: [                    // match exacly one of those schemas,
        {                       // i.e. a number that is less than 3
            type: 'number',     // or greater than 5, 
            maximum: 52         // but not between 3 and 5
        },
        { 
            type: 'number', 
            minimum: 3 
        }
    ]
}
```

### `not`

```javascript
{
    not: {                  // match a value that is not a JavaScript object
        type: 'object'
    }
}
```

## Schema Reference Using `$ref`

You can refer to types defined in other parts of the schema using the `$ref` property. This approach is often combined with the `definitions` section in the schema that contains reusable schema definitions.

```javascript
{
    type: 'array',                              // match an array containing
    items: {                                    // items that are positive
        $ref: '#/definitions/positiveInteger'   // integers
    },
    definitions: {
        positiveInteger: {
            type: 'integer',
            minimum: 0,
            exclusiveMinimum: true
        }
    }
}
```

Using references, it becomes possible to validate complex object graphs using recursive schema definitions. For example, the validator itself validates the user schema against the [JSON meta-schema][metaschema].

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
[metaschema]: http://json-schema.org/schema
[istanbul]: https://www.npmjs.org/package/istanbul
[mocha]: http://mochajs.org/