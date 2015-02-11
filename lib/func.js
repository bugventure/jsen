'use strict';

var util = require('util');

module.exports = function func() {
    var args = [].join.call(arguments, ', '),
        lines = '',
        ind = 1,
        tab = '  ',
        bs = '{[',  // block start
        be = '}]',  // block end
        push = function (line) {
            lines += new Array(ind + 1).join(tab) + line + '\n';
        },
        builder = function () {
            var line = util.format.apply(util, arguments).trim(),
                first = line[0],
                last = line[line.length - 1];

            if (be.indexOf(first) > -1 && bs.indexOf(last) > -1) {
                ind--;
                push(line);
                ind++;
            }
            else if (bs.indexOf(last) > -1) {
                push(line);
                ind++;
            }
            else if (be.indexOf(first) > -1) {
                ind--;
                push(line);
            }
            else {
                push(line);
            }

            return builder;
        };

    builder.toSource = function () {
        return 'function (' + args + ') {\n' + lines + '\n}';
    };

    builder.lines = function () {
        return lines;
    };

    builder.compile = function (context) {
        var src = 'return (' + builder.toSource() + ')',
            ctx = context || {},
            keys = Object.keys(ctx),
            vals = keys.map(function (key) { return ctx[key]; });

        return Function.apply(null, keys.concat(src)).apply(null, vals);
    };

    return builder;
};