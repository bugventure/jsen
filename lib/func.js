'use strict';

var util = require('util');

module.exports = function func() {
    var args = [].join.call(arguments, ', '),
        lines = '',
        vars = {},
        i = 0,
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

    builder.id = function (prefix) {
        return prefix + (i++);
    };

    builder.def = function (prefix, def) {
        vars[builder.id(prefix)] = def || 0;
    };

    builder.toSource = function () {
        return 'function (' + args + ') {\n' + builder.lines() + '\n}';
    };

    builder.lines = function () {
        var varKeys = Object.keys(vars),
            varDef;

        if (varKeys.length) {
            varDef = 'var ' +  Object.keys(vars).map(function forEachKey(key) {
                return 'key = ' + vars[key];
            }).join(',\n');
        }

        return varDef + '\n' + lines;
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