;(function(tokenCreator) {
    'use strict'

    tokenCreator.typeToParams = {
        'Any Char': [],
        'Specific Char': [
            {
                label: 'Character',
                builderArgIndex: 0,
                validate: function(val) {
                    // TODO escapes
                    return val.length === 1
                }
            }
        ]
    }

    var typeToBuilderName = {
        'Any Char': 'anyChar',
        'Specific Char': 'specificChar',

        // 'Set of Chars': 'charSet',
        // 'Pre-Defined Set of Chars': 'charSetPreDefn',

        // 'Line Boundary': 'assertionLB',
        // 'Word Boundary': 'assertionWB',
        // 'Look-Forward': 'assertionLF',

        /* TODO Quantified, Quantifier, Group, charSetRange,
            specificCharEsc including decimals
        */
    }
    /*
        vals is an obj, used as a map of
            (index in args for builder) -> (val of arg)
    */
    tokenCreator.create = function(type, vals) {
        var builderName = typeToBuilderName[type]
        var builderArgs = Object.keys(vals).reduce(function(arr, index) {
            arr[index] = vals[index]
            return arr
        }, [])
        var data = parser.yy.b[builderName].apply(parser.yy.b, builderArgs)
        data.textLoc = [0, 1] // so that the whole thing is always selectable
        surfaceData.addUiData(data)
        return data
    }

    var tokenToString = {
        'Any Char': function() {
            return '.'
        },
        'Specific Char': function(data) {
            return data.display
        }
    }
    tokenCreator.toString = function(data) {
        var fn = tokenToString[data.type]
        return fn(data)
    }

})(window.tokenCreator = window.tokenCreator || {})
