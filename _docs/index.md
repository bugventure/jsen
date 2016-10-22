---
permalink: get-started
title: Get Started
index: 1
---
# Get Started

Install through NPM in node.

```bash
$ npm install jsen --save
```

```javascript
var jsen = require('jsen');
var validate = jsen({ type: 'string' });
var valid = validate('some value');             // true
```

Install through Bower in your HTML page.

```bash
$ bower install jsen
```

```javascript
<script src="bower_components/jsen/dist/jsen.min.js"></script>
<script>
    var validate = jsen({ type: 'string' });    // under window.jsen
    var valid = validate('some value');         // true
</script>
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

## In-Browser Usage

Browser-compatible builds of `jsen` (with the help of [browserify](http://npmjs.com/package/browserify)) can be found in the `dist` folder. These are built with the [standalone](https://github.com/substack/browserify-handbook#standalone) option of browserify, meaning they will work in node, the browser with globals, and AMD loader environments. In the browser, the `window.jsen` global object will refer to the validator builder function.

Load from CDN, courtesy of [rawgit](https://rawgit.com/):

```
//cdn.rawgit.com/bugventure/jsen/v0.6.4/dist/jsen.js
//cdn.rawgit.com/bugventure/jsen/v0.6.4/dist/jsen.min.js
```

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
[testling-img]: https://ci.testling.com/bugventure/jsen.png
[testling-url]: https://ci.testling.com/bugventure/jsen