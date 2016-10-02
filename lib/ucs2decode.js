'use strict';

// Reference: https://github.com/bestiejs/punycode.js/blob/master/punycode.js#L101`
// Info: https://mathiasbynens.be/notes/javascript-unicode
function ucs2decode(string) {
    var output = [],
        counter = 0,
        length = string.length,
        value, extra;

    while (counter < length) {
        value = string.charCodeAt(counter++);

        if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
            // It's a high surrogate, and there is a next character.
            extra = string.charCodeAt(counter++);

            if ((extra & 0xFC00) === 0xDC00) { /* Low surrogate. */                 // jshint ignore: line
                output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);   // jshint ignore: line
            }
            else {
                // It's an unmatched surrogate; only append this code unit, in case the
                // next code unit is the high surrogate of a surrogate pair.
                output.push(value);
                counter--;
            }
        }
        else {
            output.push(value);
        }
    }

    return output;
}

ucs2decode.len = function (string) {
    return ucs2decode(string).length;
};

module.exports = ucs2decode;