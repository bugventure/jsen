'use strict';

module.exports = function func() {
    var name = arguments[0],
        args = [].join.call([].slice.call(arguments, 1), ', '),
        tab = '  ',
        lines = [],
        vars = [],
        ind = 1,
        bs = '{[',  // block start
        be = '}]',  // block end
        space = function () {
            var sp = tab, i = 0;
            while (i++ < ind - 1) { sp += tab; }
            return sp;
        },
        builder = function (line) {
            var first = line[0],
                last = line[line.length - 1];

            if (be.indexOf(first) > -1 && bs.indexOf(last) > -1) {
                ind--;
                lines.push(space() + line);
                ind++;
            }
            else if (bs.indexOf(last) > -1) {
                lines.push(space() + line);
                ind++;
            }
            else if (be.indexOf(first) > -1) {
                ind--;
                lines.push(space() + line);
            }
            else {
                lines.push(space() + line);
            }

            return builder;
        };

    builder.def = function (id, def) {
        vars.push(id + (def !== undefined ? ' = ' + def : ''));
        return builder;
    };

    builder.toSource = function () {
        return 'function ' + name + '(' + args + ') {\n' +
            tab + '"use strict"' + '\n' +
            tab + 'var ' + vars.join(',\n' + tab + '    ') + '\n' +
            lines.join('\n') + '\n}';
    };

    builder.compile = function (scope) {
        var src = 'return (' + builder.toSource() + ')',
            scp = scope || {},
            keys = Object.keys(scp),
            vals = keys.map(function (key) { return scp[key]; });

        return Function.apply(null, keys.concat(src)).apply(null, vals);
    };

    return builder;
};