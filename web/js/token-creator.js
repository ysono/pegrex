;(function(tokenCreator) {
    'use strict'

    // creators

    function simpleCreator(builderName) {
        return function(args) {
            return parser.yy.b[builderName].apply(parser.yy.b, args)
        }
    }

    // validators

    var validate = {
        token: {
            ofTypes: function(types) {
                types = [].concat(types)
                return function(token) {
                    return token && types.indexOf(token.type) >= 0
                }
            },
            asTerm: function(token) {
                return token &&
                    ['Disjunction', 'Alternative',
                    'Quantifier', 'Any Other Char', 'Range of Chars']
                        .indexOf(token.type) < 0
            },
            asGroupable: function(token) {
                return token &&
                    ['Quantifier', 'Any Other Char', 'Range of Chars']
                        .indexOf(token.type) < 0
            }
        },
        text: {
            asSingleTermOfTypes: function(types) {
                var typeValidator = validate.token.ofTypes(types)
                return function(text) {
                    var term
                    try {
                        term = parseOneTerm(text)
                        return typeValidator(term)
                    } catch(e) {
                        // TODO message?
                        return false
                    }
                }
            }
        },
        int: function(isInfAllowed) {
            return function(val) {
                if (isInfAllowed && val === 'Infinity') { return true }
                if (isNaN(val)) { return false }
                return Number(val) === parseInt(val)
            }
        }
    }
    
    // creators and creator helpers

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
    function createDisj(tokens) {
        // Making a guess as to what user wants:
        // a disj or an alt becomes an alt
        // consecutive Terms are lumped together into one alt
        var disj = {
            type: 'Disjunction',
            alternatives: []
        }
        tokens.forEach(function(token, i) {
            if (token.type === 'Disjunction') {
                disj.alternatives = disj.alternatives.concat(token.alternatives)
            } else if (token.type === 'Alternative') {
                disj.alternatives.push(token)
            } else if (validate.token.asTerm(token)) {
                ;(function() {
                    var alt
                    if (validate.token.asTerm(tokens[i - 1])) {
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

    // `tokenLabel`s don't have to match a `token.type` given by the parser.
    // ordered in the desc order of what users want to use the most.
    var createInfoList = [
        {
            tokenLabel: 'Specific Char',
            params: [
                {
                    label: 'Character',
                    validate: validate.text.asSingleTermOfTypes('Specific Char')
                }
            ],
            create: function(vals) {
                return parseOneTerm(vals[0])
            }
        },{
            tokenLabel: 'Range of Chars',
            params: [
                {
                    label: 'From',
                    validate: validate.text.asSingleTermOfTypes('Specific Char')
                },{
                    label: 'To',
                    validate: validate.text.asSingleTermOfTypes('Specific Char')
                }
            ],
            create: function(texts) {
                var tokens = texts.map(function(text) {
                    return parseOneTerm(text)
                })
                return simpleCreator('charSetRange')(tokens)
            }
        },{
            tokenLabel: 'Set of Chars',
            params: [
                {
                    label: 'Inclusive',
                    choices: {
                        'Yes': 'yes',
                        'No': 'no'
                    },
                    default: 'yes'
                },{
                    label: 'Possibility',
                    multi: true,
                    paramType: 'token',
                    validate: validate.token.ofTypes(['Specific Char', 'Range of Chars'])

                    // we could consider allowing embedding predefined, but it would be
                    //     confusing since we do not visually distinguish seln of
                    //     predefined vs custom set of chars.
                }
            ],
            create: function(vals) {
                var inclusive = vals[0] === 'yes'
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
                    validate: validate.token.ofTypes(
                        // any term except Quantified
                        ['Group', 'Set of Chars', 'Any Char', 'Specific Char'])
                },{
                    label: 'Minimal occurrence',
                    validate: validate.int()
                },{
                    label: 'Maximal occurrence',
                    validate: validate.int(true),
                    default: 'Infinity'
                },{
                    label: 'Greedy',
                    choices: {
                        'Yes': 'yes',
                        'No': 'no'
                    },
                    default: 'yes'
                }
            ],
            create: function(vals) {
                var qrStr = '{' + vals[1] + ','
                    + (vals[2] === 'Infinity' ? '' : vals[2])
                    + '}'
                    + (vals[3] === 'yes' ? '' : '?')
                var qr = parser.yy.b.quantifier(qrStr)
                qr.textLoc = [0,1]
                var qd = parser.yy.b.quantified(vals[0], qr)
                qd.qrStr = qrStr // save for use by toStringer later. Modifying parser output.
                return qd
            }
        },{
            tokenLabel: 'Group',
            params: [
                {
                    label: 'Capturing',
                    choices: {
                        'Yes': 'yes',
                        'No': 'no'
                    },
                    default: 'no'
                },{
                    label: 'Content',
                    multi: true,
                    paramType: 'token',
                    validate: validate.token.asGroupable
                }
            ],
            create: function(vals) {
                var isCapturing = vals[0] === 'yes'
                var tokens = vals[1]
                var disj = createDisj(tokens)
                return simpleCreator('group')([isCapturing, disj, 0])
            }
        },{
            tokenLabel: 'Group Reference',
            params: [
                {
                    label: 'Number',
                    validate: validate.int()
                }
            ],
            create: function(vals) {
                // not using yy builder
                return {
                    type: 'Reference',
                    // isBack: true,
                    number: Number(vals[0])
                }
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
            tokenLabel: 'Look-Forward',
            params: [
                {
                    label: 'Expect the specified thing to',
                    choices: {
                        'Be there': '=',
                        'Not be there': '!'
                    }
                },{
                    label: 'Content',
                    multi: true,
                    paramType: 'token',
                    validate: validate.token.asGroupable
                }
            ],
            create: function(vals) {
                var flag = vals[0]
                var tokens = vals[1]
                var disj = createDisj(tokens)
                return simpleCreator('assertionLF')([flag, disj])
            }
        },{
            tokenLabel: 'Any Char',
            params: [],
            create: simpleCreator('anyChar')
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
            if (token.predefinedDisplay) {
                return token.predefinedDisplay
            }
            var str = (token.inclusive ? '' : '^')
                + token.possibilities
                    .filter(function(p) {
                        return p.type !== 'Any Other Char'
                    })
                    .map(function(p) {
                        return toStringers[p.type](p)
                    })
                    .join('')
            if (! token.nonSemantic) {
                str = '[' + str + ']'
            }
            return str
        },
        'Any Char': function() {
            return '.'
        },
        'Specific Char': function(token) {
            return {
                'Space Char': ' '
            }[token.display] || token.display
        },
        'Reference': function(mockToken) {
            return '\\' + mockToken.number
        },

        groupHelper: function(disj, groupPrefix) {
            return '(' + groupPrefix + toStringers.Disjunction(disj) + ')'
        }
    }
    tokenCreator.toString = function(token) {
        return toStringers[token.type](token)
    }

})(window.tokenCreator = window.tokenCreator || {})
