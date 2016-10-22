---
title: Errors
index: 5
---
# Errors

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

When the `additionalProperties` keyword fails validation, the respective error object contains a key by the same name, specifying the property name that was found in the validated object, but was fobidden in the schema:

```javascript
var schema = {
    properties: { foo: {} },
    additionalProperties: false
}

var validate = jsen(schema);

validate({ foo: 'foo', bar: 'bar' });   // false

console.log(validate.errors);
/* Output:
[ { path: '',
    keyword: 'additionalProperties',
    additionalProperties: 'bar' } ]
*/
```

The errors array is replaced on every call of the validator function. You can safely modify the array without affecting successive validation runs.

## Custom Errors

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

## Custom Errors for Keywords

You can assign custom error messages to keywords through the `messages` object in the JSON schema.

```javascript
var schema = {
    type: 'object',
    messages: {
        type: 'Invalid data type where an object is expected'
    }
}
var validate = jsen(schema);

validate('this is a string, not an object');
console.log(validate.errors);
/* Output:
[ { path: '',
    keyword: 'type',
    message: 'Invalid data type where an object is expected' } ]
*/
```

**NOTE**: The following keywords are never assigned to error objects, and thus do not support custom error messages: `items`, `properties`, `patternProperties`, `dependecies` (when defining a [schema dependency](http://json-schema.org/latest/json-schema-validation.html#anchor70)) and `allOf`.

## Greedy Validation

For performance, by default, JSEN returns the first encountered error and bails out any further execution.

With the `options.greedy` flag passed to the builder function, the compiled validator will try to validate as much as possible, providing more info in the `errors` array.

```javascript
var schema = {
        type: 'object',
        properties: {
            firstName: {
                type: 'string',
                minLength: 1,
                maxLength: 20
            },
            lastName: {
                type: 'string',
                minLength: 2,
                maxLength: 50
            },
            age: {
                type: 'number',
                minimum: 18,
                maximum: 100
            }
        },
        required: ['firstName', 'lastName', 'age']
    };

var validate = jsen(schema, { greedy: true });  // enable greedy validation

validate({ firstName: null, lastName: '' });

console.log(validate.errors);
/* Output:
[ { path: 'firstName', keyword: 'type' },
  { path: 'lastName', keyword: 'minLength' },
  { path: 'age', keyword: 'required' } ]
*/
```
