---
title: Tests
index: 7
---
# Tests

To run [mocha][mocha] tests in node:

```bash
[~/github/jsen] $ npm test
```

To run the same test suite in the browser, serve the `test/index.html` page in your node web server and navitate to `/test/` path from your browser. The example below uses [node-static](https://www.npmjs.com/package/node-static):

```bash
[~/github/jsen] $ npm install -g node-static
...
[~/github/jsen] $ static .
serving "." at http://127.0.0.1:8080
# navigate to http://127.0.0.1:8080/test/ in your browser
```

`jsen` passes all draft 4 test cases specified by the [JSON-Schema-Test-Suite](https://github.com/json-schema/JSON-Schema-Test-Suite) with the exception of zero-terminated float tests.

Source code coverage is provided by [istanbul][istanbul] and visible on [coveralls.io][coveralls-url].
