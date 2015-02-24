;(function(tokenCreator) {
    'use strict'

    function simpleCreator(builderName) {
        return function(args) {
            return parser.yy.b[builderName].apply(parser.yy.b, args)
        }
    }

    function parserTypeValidator(types) {
        return function(compoData) {
            return compoData &&
                ([].concat(types)).indexOf(compoData.type) >= 0
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

    // `tokenLabel`s don't have to match a component `type` given by the parser.
    //     E.g. pre-defined `Set of Chars` is created differently from
    //         custom `Set of Chars`.
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
                    paramType: 'component',
                    validate: parserTypeValidator('Specific Char')
                },{
                    label: 'To',
                    paramType: 'component',
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
                    }
                },{
                    label: 'Possibility',
                    paramType: 'component',
                    validate: parserTypeValidator(['Specific Char', 'Range of Chars'])
                }
            ],
            create: function(vals) {
                var inclusive = vals[0] === 'true'
                var items = vals.slice(1)
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
                    paramType: 'component',
                    validate: function(val) {
                        if (! val) { return false }
                        // has to be a term. not assertion, alt, disj, pattern.
                        return ['Assertion', 'Grouped Assertion'].indexOf(val.type) < 0
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
                    }
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
        var data
        try {
            data = createInfoMap[tokenLabel].create(vals)
            data.textLoc = [0, 1] // so that the whole thing is always selectable
            // not calling `surfaceData.addUiData`. Do it just before rendering.
            return data
        } catch(e) {
            console.error(e.stack, e)
            return e
        }
    }


    // keys are parser `type`s.
    var toStringers = {
        'Specific Char': function(data) {
            return data.display
        },
        'Any Char': function() {
            return '.'
        },
        'Range of Chars': function(data) {
            return data.range[0].display + '-'
                + data.range[1].display
        },
        'Set of Chars': function(data) {
            if (data.predefined) {
                return data.predefined.display
            }
            return '['
                + (data.inclusive ? '' : '^')
                + data.possibilities
                    .filter(function(p) {
                        return p.type !== 'Any Other Char'
                    })
                    .map(function(p) {
                        return toStringers[p.type](p)
                    })
                    .join(',')
                + ']'
        },
        'Quantified': function(data) {
            debugger
            var t = toStringers[data.target.type](data.target)
            return t + data.qrStr
        },
        'Assertion': function(data) {
            if (data.hasOwnProperty('atBeg')) {
                return data.atBeg ? '^' : '$'
            } else if (data.hasOwnProperty('atWb')) {
                return '\\' + (data.atWb ? 'b' : 'B')
            }
        },
    }
    tokenCreator.toString = function(data) {
        return toStringers[data.type](data)
    }

})(window.tokenCreator = window.tokenCreator || {})
