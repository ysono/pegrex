;(function(tokenCreator) {
    'use strict'

    function simpleCreator(builderName) {
        return function(args) {
            return parser.yy.b[builderName].apply(parser.yy.b, args)
        }
    }

    function parserTypeValidator(types) {
        types = [].concat(types)
        return function(token) {
            return token &&
                types.indexOf(token.type) >= 0
        }
    }
    function numValidator(isInfAllowed) {
        return function(val) {
            return (isInfAllowed && val === 'Infinity')
                || (
                    ! isNaN(val) && ! isNaN(Number(val)) && ! isNaN(parseInt(val))
                )
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
    // 'Look-Forward': 'assertionLF',
    // Group,

    // `tokenLabel`s don't have to match a `token.type` given by the parser.
    var createInfoList = [
        {
            tokenLabel: 'Specific Char',
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
        },{
            tokenLabel: 'Any Char',
            params: [],
            create: simpleCreator('anyChar')
        },{
            tokenLabel: 'Range of Chars',
            params: [
                {
                    label: 'From',
                    paramType: 'token',
                    validate: parserTypeValidator('Specific Char')
                },{
                    label: 'To',
                    paramType: 'token',
                    validate: parserTypeValidator('Specific Char')
                }
            ],
            create: simpleCreator('charSetRange')
        },{
            tokenLabel: 'Set of Chars',
            params: [
                {
                    label: 'Inclusive',
                    choices: {
                        'Yes': 'true',
                        'No': 'false'
                    },
                    default: 'true'
                },{
                    label: 'Possibility',
                    mult: true,
                    paramType: 'token',
                    validate: parserTypeValidator(['Specific Char', 'Range of Chars'])
                }
            ],
            create: function(vals) {
                var inclusive = vals[0] === 'true'
                var items = vals[1].slice() // clone so 'Any Other Char' isn't persisted in form states
                return parser.yy.b.charSet(inclusive, items)
            }
        },{
            tokenLabel: 'Pre-Defined Set of Chars',
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
        },{
            tokenLabel: 'Repetition',
            params: [
                {
                    label: 'Component being repeated',
                    paramType: 'token',
                    validate: function(val) {
                        if (! val) { return false }
                        // has to be a term. is there a better way to get the list?
                        return ['Assertion', 'Grouped Assertion', 'Range of Chars', 'Any Other Char']
                            .indexOf(val.type) < 0
                    }
                },{
                    label: 'Minimal occurrence',
                    validate: numValidator()
                },{
                    label: 'Maximal occurrence',
                    validate: numValidator(true),
                    default: 'Infinity'
                },{
                    label: 'Greedy',
                    choices: {
                        'Yes': 'true',
                        'No': 'false'
                    },
                    default: 'true'
                }
            ],
            create: function(vals) {
                var qrStr = '{' + vals[1] + ','
                    + (vals[2] === 'Infinity' ? '' : vals[2])
                    + '}'
                    + (vals[3] === 'true' ? '' : '?')
                var qr = parser.yy.b.quantifier(qrStr)
                qr.textLoc = [0,1]
                var qd = parser.yy.b.quantified(vals[0], qr)
                qd.qrStr = qrStr // save for use by toStringer later. Modifying parser output.
                return qd
            }
        },{
            tokenLabel: 'Line Boundary',
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
        },{
            tokenLabel: 'Word Boundary',
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
        }
    ]
    var createInfoMap = createInfoList.reduce(function(map, createInfo) {
        map[createInfo.tokenLabel] = createInfo
        return map
    }, {})
    tokenCreator.tokenLabels = createInfoList.map(function(createInfo) {
        return createInfo.tokenLabel
    })
    tokenCreator.getParams = function(tokenLabel) {
        return createInfoMap[tokenLabel].params
    }
    tokenCreator.create = function(tokenLabel, vals) {
        var token
        try {
            token = createInfoMap[tokenLabel].create(vals)
            token.textLoc = [0, 1] // so that the whole thing is always selectable
            return token
        } catch(e) {
            console.error(e.stack)
            return e
        }
    }


    // keys are parser `type`s.
    var toStringers = {
        'Specific Char': function(token) {
            return token.display
        },
        'Any Char': function() {
            return '.'
        },
        'Range of Chars': function(token) {
            return token.range[0].display + '-'
                + token.range[1].display
        },
        'Set of Chars': function(token) {
            if (token.predefined) {
                return token.predefined.display
            }
            return '['
                + (token.inclusive ? '' : '^')
                + token.possibilities
                    .filter(function(p) {
                        return p.type !== 'Any Other Char'
                    })
                    .map(function(p) {
                        return toStringers[p.type](p)
                    })
                    .join(',')
                + ']'
        },
        'Quantified': function(token) {
            var t = toStringers[token.target.type](token.target)
            return t + token.qrStr
        },
        'Assertion': function(token) {
            if (token.hasOwnProperty('atBeg')) {
                return token.atBeg ? '^' : '$'
            } else if (token.hasOwnProperty('atWb')) {
                return '\\' + (token.atWb ? 'b' : 'B')
            }
        },
    }
    tokenCreator.toString = function(token) {
        return toStringers[token.type](token)
    }

})(window.tokenCreator = window.tokenCreator || {})
