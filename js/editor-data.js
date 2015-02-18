;(function(editorData) {
    'use strict'

    editorData.typeToParams = {
        'Any Char': [],
        'Specific Char': [
            {
                label: 'Character',
                builderArgIndex: 0,
                validator: function(val) {
                    // TODO escapes
                    return val.length === 1
                }
            }
        ]
    }
    // editorData.getParams = function(type) {
    //     return typeToParams[type]
    // }

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
    /* `params` is an obj */
    editorData.build = function(type, params) {
        var builderName = typeToBuilderName[type]
        var builderArgs = Object.keys(params).reduce(function(arr, index) {
            arr[index] = params[index]
            return arr
        }, [])
        var data = parser.yy.b[builderName].apply(parser.yy.b, builderArgs)
        surfaceData.addUiData(data)
        return data
    }
})(window.editorData = window.editorData || {})
