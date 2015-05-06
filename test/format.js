'use strict';

var assert = require('assert'),
    jsen = require('../index.js');

describe('format', function () {
    it('date-time', function () {
        var schema = { format: 'date-time' },
            validate = jsen(schema);

        assert(validate(new Date().toJSON()));

        assert(!validate(''));
        assert(!validate(new Date().toUTCString()));
        assert(!validate(new Date().toLocaleDateString()));
        assert(!validate(new Date().toTimeString()));
    });

    it('uri', function () {
        var schema = { format: 'uri' },
            validate = jsen(schema);

        assert(validate('http://google.com'));
        assert(validate('ftp://my-site'));
        assert(validate('custom://my-site/long/$cr@mbl3d/u_r-l?with=query%20string'));
        assert(validate('//no-scheme-here'));

        assert(!validate(''));
        assert(!validate('google'));
        assert(!validate('/google'));
        assert(!validate('://google'));
        assert(!validate('http://google.com/no space allowed'));
    });

    it('email', function () {
        var schema = { format: 'email' },
            validate = jsen(schema),
            maxLongHostname1 = new Array(5).join('.' + new Array(64).join('a')).substr(1),  // 255 chars (4 groups x 63 chars)
            maxLongHostname2 = new Array(9).join('.' + new Array(32).join('a')).substr(1);  // 255 chars (8 groups x 31 chars)

        assert(validate('me@domain'));
        assert(validate('first.last+plus-dash#hash!bang$dollar%percent&amp\'quote*star/dash=equal?question^pow_under`backtick{brace}|bar~tilde@domain'));
        assert(validate('me@domain.with.multiple.subdomains'));
        assert(validate('me@domain-parts.may.contain-dashes'));
        assert(validate('me@a-single-domain-part-can-be-up-to-sixty-three-characters-long63'));
        assert(validate('me@' + maxLongHostname1));
        assert(validate('me@' + maxLongHostname2));

        assert(!validate(''));
        assert(!validate('qu"ote\'s@domain'));
        assert(!validate('me@no_underscores+or?special$chars'));
        assert(!validate('me@ends-with-dash-'));
        assert(!validate('me@-starts-with-dash'));
        assert(!validate('me@asingle-domain-part-cannot-be-longer-than-sixty-three-characters'));

        // These verify that a hostname cannot be longer than 255 chars in total. However,
        // maximum string length verification cannot be performed in the same regex, so
        // these test cases fail. Users must additionall use the `maxlength` keyword in this case.
        // assert(!validate('me@' + maxLongHostname1 + '.a'));
        // assert(!validate('me@' + maxLongHostname2 + '.a'));
    });

    it('ipv4', function () {
        var schema = { format: 'ipv4' },
            validate = jsen(schema);

        assert(validate('0.0.0.0'));
        assert(validate('255.255.255.255'));
        assert(validate('127.0.0.1'));

        assert(!validate(''));
        assert(!validate('...'));
        assert(!validate('0.0.0.-1'));
        assert(!validate('0.0.-1.0'));
        assert(!validate('0.-1.0.0'));
        assert(!validate('-1.0.0.0'));
        assert(!validate('256.0.0.0'));
        assert(!validate('0.256.0.0'));
        assert(!validate('0.0.256.0'));
        assert(!validate('0.0.0.256'));
    });

    // reference:
    // https://gist.github.com/syzdek/6086792
    // http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
    it('ipv6', function () {
        var schema = { format: 'ipv6' },
            validate = jsen(schema);

        assert(validate('1:2:3:4:5:6:7:8'));
        assert(validate('1::'));
        assert(validate('1:2:3:4:5:6:7::'));
        assert(validate('1::8'));
        assert(validate('1:2:3:4:5:6::8'));
        assert(validate('1::7:8'));
        assert(validate('1:2:3:4:5::7:8'));
        assert(validate('1:2:3:4:5::8'));
        assert(validate('1::6:7:8'));
        assert(validate('1:2:3:4::6:7:8'));
        assert(validate('1:2:3:4::8'));
        assert(validate('1::5:6:7:8'));
        assert(validate('1:2:3::5:6:7:8'));
        assert(validate('1:2:3::8'));
        assert(validate('1::4:5:6:7:8'));
        assert(validate('1:2::4:5:6:7:8'));
        assert(validate('1:2::8'));
        assert(validate('1::3:4:5:6:7:8'));
        assert(validate('1::8'));
        assert(validate('::2:3:4:5:6:7:8'));
        assert(validate('::8'));
        assert(validate('::'));

        // link-local IPv6 addresses with zone index
        assert(validate('fe80::7:8%eth0'));
        assert(validate('fe80::7:8%1'));

        // IPv4-mapped IPv6 addresses and IPv4-translated addresses
        assert(validate('::255.255.255.255'));
        assert(validate('::ffff:255.255.255.255'));
        assert(validate('::ffff:0:255.255.255.255'));

        // IPv4-Embedded IPv6 Address
        assert(validate('2001:db8:3:4::192.0.2.33'));
        assert(validate('64:ff9b::192.0.2.33'));

        assert(!validate(''));
        assert(!validate('::_'));

        // TODO: we may need more invalid cases here
    });

    it('hostname', function () {
        var schema = { format: 'hostname' },
            validate = jsen(schema),
            maxLong1 = new Array(5).join('.' + new Array(64).join('a')).substr(1),  // 255 chars (4 groups x 63 chars)
            maxLong2 = new Array(9).join('.' + new Array(32).join('a')).substr(1);  // 255 chars (8 groups x 31 chars)

        assert(validate('my.host'));
        assert(validate('host'));
        assert(validate('domain.with.multiple.subdomains'));
        assert(validate('domain-parts.may.contain-dashes'));
        assert(validate('a-single-domain-part-can-be-up-to-sixty-three-characters-long63'));
        assert(validate(maxLong1));
        assert(validate(maxLong2));

        assert(!validate(''));
        assert(!validate('me@domain'));
        assert(!validate('qu"ote\'s'));
        assert(!validate('no_underscores+or?special$chars'));
        assert(!validate('ends-with-dash-'));
        assert(!validate('-starts-with-dash'));
        assert(!validate('asingle-domain-part-cannot-be-longer-than-sixty-three-characters'));

        // These verify that a hostname cannot be longer than 255 chars in total. However,
        // maximum string length verification cannot be performed in the same regex, so
        // these test cases fail. Users must additionall use the `maxlength` keyword in this case.
        // assert(!validate(maxLong1 + '.a'));
        // assert(!validate(maxLong2 + '.a'));
    });
});