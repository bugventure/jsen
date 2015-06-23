'use strict';

module.exports = function func() {
    var name = arguments[0] || '',
        args = [].join.call([].slice.call(arguments, 1), ', '),
        lines = '',
        vars = '',
        ind = 1,
        tab = '  ',
        bs = '{[',  // block start
        be = '}]',  // block end
        space = function () {
            return new Array(ind + 1).join(tab);
        },
        push = function (line) {
            lines += space() + line + '\n';
        },
        builder = function (line) {
            var first = line[0],
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
        vars += space() + 'var ' + id + (def !== undefined ? ' = ' + def : '') + '\n';

        return builder;
    };

    builder.toSource = function () {
        return 'function ' + name + '(' + args + ') {\n' + vars + '\n' + lines + '\n}';
    };

    builder.compile = function (scope) {
        var src = 'return (' + builder.toSource() + ')',
            scp = scope || {},
            keys = Object.keys(scp),
            vals = keys.map(function (key) { return scp[key]; });

        console.log(keys.concat(src));
        return Function.apply(null, keys.concat(src)).apply(null, vals);
    };

    return builder;
};