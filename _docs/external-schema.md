---
title: External Schema
index: 4
---
# External Schema

You can use references to external schema objects through the `$ref` keyword. You pass external schemas in the `options.schemas` object:

```javascript
var external = { type: 'string' },
    schema = { $ref: '#external' },
    validate = jsen(schema, {
        schemas: {
            external: external
        }
    });

validate('abc');    // true
validate(123);      // false
```

If you expect to have `$ref`s pointing to missing schemas, you can tell JSEN to ignore invalid schema references with the `options.missing$Ref` flag.

```javascript
var schema = { $ref: '#missing' },
    validate;

validate = jsen(schema);    // Error: jsen: invalid schema reference #missing

validate = jsen(schema, {   // OK, will ignore missing references
    missing$Ref: true
})
```

## Remote Schemas

Although JSEN does not automatically fetch remote schemas by making HTTP requests, you can fetch and provide them through the `schemas` option by giving their URIs as object keys.

```javascript
var schema = { $ref: 'http://localhost:1234/integer.json' },
    externalSchema = { type: 'integer' }, // Downloaded from http://localhost:1234/integer.json
    validate = jsen(schema, {
        schemas: {
            'http://localhost:1234/integer.json': externalSchema
        }
    });
```
