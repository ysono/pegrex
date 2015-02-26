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


    var termTypeValidator = parserTypeValidator(
        ['Quantified', 'Group', 'Set of Chars', 'Any Char', 'Specific Char'])
    var groupedTypeValidator = parserTypeValidator(
        ['Disjunction', 'Alternative',
        'Quantified', 'Group', 'Set of Chars', 'Any Char', 'Specific Char'])
    function createDisj(tokens) {
        // Making a guess as to what user wants:
        // an entry of disj or alt becomes an alt
        // consecutive Terms are lumped together into one Alternative
        var disj = {
            type: 'Disjunction',
            alternatives: []
        }
        tokens.forEach(function(token, i) {
            if (token.type === 'Disjunction') {
                disj.alternatives = disj.alternatives.concat(token.alternatives)
            } else if (token.type === 'Alternative') {
                disj.alternatives.push(token)
            } else if (termTypeValidator(token)) {
                ;(function() {
                    var alt
                    if (termTypeValidator(tokens[i - 1])) {
                        alt = disj.alternatives.slice(-1)[0]
                    } else {
                        alt = {
                            type: 'Alternative',
                            terms: []
                        }
                        disj.alternatives.push(alt)
                    }
                    alt.terms.push(token)
                })()
            } else {
                throw new Error('could not add token to group', token)
            }
        })
        return disj
    }

    // TODO
    // 'Look-Forward': 'assertionLF',
    // Group,

    // `tokenLabel`s don't have to match a `token.type` given by the parser.
    // ordered in the desc order of what users want to use the most.
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
            tokenLabel: 'Group',
            params: [
                {
                    label: 'Capturing',
                    choices: {
                        'Yes': 'true',
                        'No': 'false'
                    },
                    default: 'false'
                },{
                    label: 'Content',
                    mult: true,
                    paramType: 'token',
                    validate: groupedTypeValidator
                }
            ],
            create: function(vals) {
                var isCapturing = vals[0] === 'true'
                var tokens = vals[1]
                var disj = createDisj(tokens)
                return simpleCreator('group')([isCapturing, disj, 0])
            }
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
                var items = vals[1]
                return parser.yy.b.charSet(null, inclusive, items)
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
                    validate: parserTypeValidator(
                        // any term except Quantified
                        ['Group', 'Set of Chars', 'Any Char', 'Specific Char'])
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
        },{
            tokenLabel: 'Look-Forward Assertion',
            params: [
                {
                    label: 'Expect the specified thing to',
                    choices: {
                        'Be there': '=',
                        'Not be there': '!'
                    }
                },{
                    label: 'Content',
                    mult: true,
                    paramType: 'token',
                    validate: groupedTypeValidator
                }
            ],
            create: function(vals) {
                var flag = vals[0]
                var tokens = vals[1]
                var disj = createDisj(tokens)
                return simpleCreator('assertionLF')([flag, disj])
            }
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
            console.warn(e.stack)
            return e
        }
    }


    // keys are parser `type`s.
    var toStringers = {
        'Disjunction': function(token) {
            return token.alternatives
                .map(function(alt) {
                    return toStringers.Alternative(alt)
                })
                .join('|')
        },
        'Alternative': function(token) {
            return token.terms
                .map(function(t) {
                    return toStringers[t.type](t)
                })
                .join('')
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
        'Grouped Assertion': function(token) {
            return toStringers.groupHelper(token.grouped,
                /^Pos/.test(token.assertion) ? '?=' : '?!')
        },
        'Group': function(token) {
            return toStringers.groupHelper(token.grouped,
                typeof token.number === 'number' ? '' : '?:')
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
        'Any Char': function() {
            return '.'
        },
        'Specific Char': function(token) {
            return token.display
        },

        groupHelper: function(disj, groupPrefix) {
            return '(' + groupPrefix + toStringers.Disjunction(disj) + ')'
        }
    }
    tokenCreator.toString = function(token) {
        return toStringers[token.type](token)
    }

})(window.tokenCreator = window.tokenCreator || {})
