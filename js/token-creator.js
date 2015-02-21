;(function(tokenCreator) {
    'use strict'

    function creatorSimple(builderName) {
        return function(args) {
            return parser.yy.b[builderName].apply(parser.yy.b, args)
        }
    }

    function validatorTextLen(len) {
        return function(val) {
            return val.length === len
        }
    }

    // TODO
    // Range of Chars
    // 'Set of Chars': 'charSet',
    // 'Look-Forward': 'assertionLF',
    // Quantified, Quantifier, Group,
    var tokenInfo = {
        'Line Boundary': {
            params: [
                {
                    label: 'At',
                    choices: {
                        'Beginning': '^',
                        'End': '$'
                    }
                }
            ],
            create: creatorSimple('assertionLB'),
            toString: function(data) {
                return data.atBeg ? '^' : '$'
            }
        },
        'Word Boundary': {
            params: [
                {
                    label: 'At a boundary',
                    choices: {
                        'Yes': '\\b',
                        'No': '\\B'
                    }
                }
            ],
            create: creatorSimple('assertionWB'),
            toString: function(data) {
                return '\\' + (data.atWb ? 'b' : 'B')
            }
        },
        // 'Range of Chars': {
        //     params: [
        //         {
        //             label: 'From',
        //             validate: validatorTextLen(1)
        //         },
        //         {
        //             label: 'To',
        //             validate: validatorTextLen(1)
        //         }
        //     ],
        //     create: creatorSimple('charSetRange'),
        //     toString: function(vals) {
        //         return vals[0] + '-' + vals[1]
        //     }
        // },
        'Pre-defined set of Chars': {
            params: [
                {
                    label: 'Selection',
                    choices: {
                        'Decimal': 'd',
                        'Non-Decimal': 'D',
                        'Whitespace': 's',
                        'Non-Whitespace': 'S',
                        'Word Char': 'w',
                        'Non-Word Char': 'W'
                    }
                }
            ],
            create: creatorSimple('charSetPreDefn'),
            toString: function(data) {
                return data.predefined.display
            }
        },
        'Any Char': {
            params: [],
            create: creatorSimple('anyChar'),
            toString: function() {
                return '.'
            }
        },
        'Specific Char': {
            params: [
                {
                    label: 'Character',
                    validate: function(val) {
                        // TODO escapes including octal
                        return val.length === 1
                    }
                }
            ],
            create: creatorSimple('specificChar'),
            toString: function(data) {
                return data.display
            }
        }
    }
    tokenCreator.tokenLabels = Object.keys(tokenInfo)
    tokenCreator.getParams = function(tokenLabel) {
        return tokenInfo[tokenLabel].params
    }
    tokenCreator.create = function(tokenLabel, vals) {
        var data
        try {
            data = tokenInfo[tokenLabel].create(vals)
            data.textLoc = [0, 1] // so that the whole thing is always selectable
            surfaceData.addUiData(data)
        } catch(e) {
            console.error(tokenLabel, vals)
            throw 'token creation failed for ' + tokenLabel
        }
        return data
    }
    tokenCreator.toString = function(tokenLabel, data) {
        return tokenInfo[tokenLabel].toString(data)
    }

})(window.tokenCreator = window.tokenCreator || {})
