;(function(tokenCreator) {
    'use strict'

    function simpleCreator(builderName) {
        return function(args) {
            return parser.yy.b[builderName].apply(parser.yy.b, args)
        }
    }

    function typeValidator(type) {
        return function(compoData) {
            return compoData && compoData.type === type
        }
    }

    function parseOneTerm(text) {
        var pattern = parser.parse(text)
        var disj = pattern.roots.filter(function(root) {
            return root.type === 'Disjunction'
        })[0]
        if (disj.alternatives.length !== 1) { return null }
        var alt = disj.alternatives[0]
        if (alt.terms.length !== 1) { return null }
        return alt.terms[0]
    }

    // TODO
    // 'Set of Chars': 'charSet',
    // 'Look-Forward': 'assertionLF',
    // Quantified, Quantifier, Group,

    // the keys of createInfo are referred to as `tokenLabel`s and don't have
    //     to match a component `type` given by the parser. E.g. pre-defined
    //     `Set of Chars` is created differently from custom `Set of Chars`.
    var createInfo = {
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
            create: simpleCreator('assertionLB')
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
            create: simpleCreator('assertionWB')
        },
        'Range of Chars': {
            params: [
                {
                    label: 'From',
                    paramType: 'component',
                    validate: typeValidator('Specific Char')
                },
                {
                    label: 'To',
                    paramType: 'component',
                    validate: typeValidator('Specific Char')
                }
            ],
            create: simpleCreator('charSetRange')
        },
        'Pre-Defined Set of Chars': {
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
            create: simpleCreator('charSetPreDefn')
        },
        'Any Char': {
            params: [],
            create: simpleCreator('anyChar')
        },
        'Specific Char': {
            params: [
                {
                    label: 'Character',
                    validate: function(val) {
                        try {
                            var term = parseOneTerm(val)
                            return term.type === 'Specific Char'
                        } catch(e) {
                            return false
                        }
                    }
                }
            ],
            create: function(vals) {
                return parseOneTerm(vals[0])
            }
        }
    }
    tokenCreator.tokenLabels = Object.keys(createInfo)
    tokenCreator.getParams = function(tokenLabel) {
        return createInfo[tokenLabel].params
    }
    tokenCreator.create = function(tokenLabel, vals) {
        var data
        try {
            data = createInfo[tokenLabel].create(vals)
            data.textLoc = [0, 1] // so that the whole thing is always selectable
            // not calling `surfaceData.addUiData`. Do it just before rendering.
            return data
        } catch(e) {
            return e
        }
    }


    // keys are parser `type`s.
    var toStringers = {
        'Assertion': function(data) {
            if (data.hasOwnProperty('atBeg')) {
                return data.atBeg ? '^' : '$'
            } else if (data.hasOwnProperty('atWb')) {
                return '\\' + (data.atWb ? 'b' : 'B')
            }
        },
        'Range of Chars': function(data) {
            return data.range[0].display + '-'
                + data.range[1].display
        },
        'Set of Chars': function(data) {
            if (data.predefined) {
                return data.predefined.display
            }
            return '[' + ']'
            // TODO
        },
        'Any Char': function() {
            return '.'
        },
        'Specific Char': function(data) {
            return data.display
        }
    }
    tokenCreator.toString = function(data) {
        return toStringers[data.type](data)
    }

})(window.tokenCreator = window.tokenCreator || {})
