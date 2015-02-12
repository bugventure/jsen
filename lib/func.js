'use strict';

var util = require('util');

module.exports = function func() {
    var args = [].join.call(arguments, ', '),
        lines = '',
        vars = {},
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

    builder.def = function (id, def) {
        if (def !== undefined) {
            def = util.format.apply(util, [].slice.call(arguments, 1));
        }

        vars[id] = def;

        return builder;
    };

    builder.toSource = function () {
        return 'function (' + args + ') {\n' + builder.lines() + '\n}';
    };

    builder.vars = function () {
        var varKeys = Object.keys(vars);

        if (!varKeys.length) {
            return '';
        }

        return 'var ' +  Object.keys(vars).map(function forEachKey(key) {
            return key + (vars[key] !== undefined ? ' = ' + vars[key] : '');
        }).join(',\n');
    };

    builder.lines = function () {
        return builder.vars() + '\n' + lines;
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