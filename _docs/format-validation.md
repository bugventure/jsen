---
title: Format Validation
index: 3
---
# Format Validation

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

## Custom Formats

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
