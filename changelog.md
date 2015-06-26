## Changelog

### v0.5.1

* Performance improvement (#35)

### v0.5.0

* Add greedy mode (#32, #33)

### v0.4.1

* Fix recursive calls to the same cached $ref validator resets the errors array (#30)

### v0.4.0

* Add external schema references (#20)
* Fix cloning Date objects is broken in Firefox (#26)
* Fix broken tests under IE9 (#27)
* Fix `npm test` command to run mocha from the local node_modules

### v0.3.2

* Add in-browser support out of the box (#23)
* Fix broken inlining of regular expressions containing forward slashes when running in the browser (#25)

### v0.3.1

* Add support for IE8

### v0.3.0

* Add support for default value population (#10)
* Add support for custom messages per keyword (#18)

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