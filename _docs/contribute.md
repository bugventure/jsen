---
title: Contribute
index: 9
---
# Contribute

To contribute to the project, fork the repo, edit and send a Pull Request. Please adhere to the coding guidelines enforced by the [jshint](https://github.com/bugventure/jsen/blob/master/.jshintrc) and [jscs](https://github.com/bugventure/jsen/blob/master/.jscsrc) code checkers.

```bash
[~/github/jsen] $ jshint lib/ && jscs lib/
No code style errors found.
```

All tests must pass both in node and in the browser.

```bash
[~/github/jsen] $ npm test
```

To build the jsen browser-compatible distribution files, run:

```bash
[~/github/jsen] $ npm run build
```

This will update the files in the `/dist` folder.

## Issues

Please submit issues to the [jsen issue tracker in GitHub](https://github.com/bugventure/jsen/issues).
