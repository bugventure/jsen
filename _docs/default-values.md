---
title: Default Values
index: 6
---
# Gathering Default Values

JSEN can collect default values from the schema. The `build(initial, options)` method in the dynamic validator function recursively walks the schema object and compiles the default values into a single object or array.

```javascript
var validate = jsen({ type: 'string', default: 'abc' });
console.log(validate.build());      // 'abc'

var validate = jsen({
    default: {},
    properties: {
        foo: { default: 'bar' },
        arr: {
            default: [],
            items: [
                { default: 1 },
                { default: 1 },
                { default: 2 }
            ]
        }
    }
});
console.log(validate.build());      // { foo: 'bar', arr: [1, 2, 3] }
```

The `build` function can additionally merge the default values with an initially provided data object.

```javascript
var validate = jsen({
    properties: {
        rememberMe: {
            default: 'true'
        }
    }
});

var initial = { username: 'John', password: 'P@$$w0rd' };

initial = validate.build(initial);

console.log(initial);
// { username: 'John', password: 'P@$$w0rd', rememberMe: true }
```

## options.copy

By default, the `build` function creates a copy of the initial data object. You can opt to modify the object in-place by passing `{ copy: false }` as a second argument.

```javascript
var initial = { username: 'John', password: 'P@$$w0rd' };
var validate = jsen({
    properties: {
        rememberMe: {
            default: 'true'
        }
    }
});

var withDefaults = validate.build(initial);
console.log(withDefaults === initial);      // false (initial is cloned)

withDefaults = validate.build(initial, { copy: false });
console.log(withDefaults === initial);      // true (initial is modified)
```

## options.additionalProperties

The JSON schema spec allows additional properties by default. In many cases, however, this default behavior may be undesirable, forcing developers to specify `additionalProperties: false` everywhere in their schema objects. JSEN's `build` function can filter out additional properties by specifying `{ additionalProperties: false }` as a second argument.

```javascript
var validate = jsen({
    properties: {
        foo: {},
        bar: {}
    }
});

var initial = { foo: 1, bar: 2, baz: 3};

initial = validate.build(initial, { additionalProperties: false });

console.log(initial);   // { foo: 1, bar: 2 }
```

When both `options.additionalProperties` and `schema.additionalProperties` are specified, the latter takes precedence.

```javascript
var validate = jsen({
    additionalProperties: true,
    properties: {
        foo: {},
        bar: {}
    }
});

var initial = { foo: 1, bar: 2, baz: 3};

initial = validate.build(initial, { additionalProperties: false });

console.log(initial);   // { foo: 1, bar: 2, baz: 3 }
```

NOTE: When `{ additionalProperties: false, copy: false }` is specified in the `build` options, any additional properties will be deleted from the initial data object.

In some scenarios, you may want to disallow additional properties in the schema, but still keep them when gathering default values with `build()`. This may be required, for example, when you want to explicitly fail validation and display a message to the user, listing any excessive properties that are forbidden by the schema. Setting `{ additionalProperties: 'always' }` will prevent the `build()` function from removing any properties in the initial object.

```javascript
var schema = {
        additionalProperties: false,
        properties: {
            foo: {}
        }
    };
var initial = { foo: 1, bar: 2 };
var validate = jsen(schema);

var withDefaults = validate.build(initial, { additionalProperties: 'always' });
// withDefaults has both 'foo' and 'bar' keys
```
