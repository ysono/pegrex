var _ = require('lodash')
var parser = require('../parser')

function disjunction(terms) {
    return {
        type: 'Disjunction',
        alternatives: [
            {
                type: 'Alternative',
                terms: terms
            }
        ]
    }
}
function capturedSingleAnyChar(locBegin) {
    return {
        type: 'Group',
        isCapturing: true,
        grouped: disjunction([
            {
                type: 'Any Char',
                display: '.',
                location: [locBegin,locBegin+1]
            }
        ])
    }
}

var specs = [
    [
        /\128/,
        [
            {
                type: 'Specific Char',
                display: '\\12',
                meaning: 'Octal Notation',
                location: [0,3]
            },
            {
                type: 'Specific Char',
                display: '8',
                location: [3,4]
            }
        ]
    ], [
        /\377/,
        [
            {
                type: 'Specific Char',
                display: '\\377',
                meaning: 'Octal Notation',
                location: [0,4]
            }
        ]
    ], [
        /\400/,
        [
            {
                type: 'Specific Char',
                display: '\\40',
                meaning: 'Octal Notation',
                location: [0,3]
            },
            {
                type: 'Specific Char',
                display: '0',
                location: [3,4]
            }
        ]
    ], [
        /(.)(.)[\2]/,
        [
            capturedSingleAnyChar(1),
            capturedSingleAnyChar(4),
            {
                type: 'Set of Chars',
                inclusive: true,
                possibilities: [
                    {
                        type: 'Specific Char',
                        display: '\\2',
                        meaning: 'Octal Notation',
                        location: [7,9]
                    }
                ],
                location: [6,10]
            }
        ]
    ], [
        /(.)(.)\2/,
        [
            capturedSingleAnyChar(1),
            capturedSingleAnyChar(4),
            {
                type: 'Back Reference',
                number: 2,
                location: [6,8]
            }
        ]
    ], [
        /(.)\0/,
        [
            capturedSingleAnyChar(1),
            {
                type: 'Specific Char',
                display: '\\0',
                meaning: 'Octal Notation',
                location: [3,5]
            }
        ]
    ], [
        /()\0/,
        [
            {
                type: 'Group',
                isCapturing: true,
                grouped: disjunction([])
                // location omitted
            },
            {
                type: 'Specific Char',
                display: '\\0',
                meaning: 'Octal Notation',
                location: [2,4]
            }
        ]
    ], [
        /(.)\2/,
        [
            capturedSingleAnyChar(1),
            {
                type: 'Specific Char',
                display: '\\2',
                meaning: 'Octal Notation',
                location: [3,5]
            }
        ]
    ], [
        /(.)(.)\2/,
        [
            capturedSingleAnyChar(1),
            capturedSingleAnyChar(4),
            {
                type: 'Back Reference',
                number: 2,
                location: [6,8]
            }
        ]
    ], [
        /^(q)\2(w)$/,
        [
            {
                type: 'Assertion',
                assertion: 'Line Boundary',
                atBeginning: true,
                location: [0,1]
            },
            {
                type: 'Group',
                isCapturing: true,
                grouped: disjunction([
                    {
                        type: 'Specific Char',
                        display: 'q',
                        location: [2,3]
                    }
                ])
                // location omitted
            },
            {
                type: 'Forward Reference',
                number: 2,
                location: [4,6]
            },
            {
                type: 'Group',
                isCapturing: true,
                grouped: disjunction([
                    {
                        type: 'Specific Char',
                        display: 'w',
                        location: [7,8]
                    }
                ])
                // location omitted
            },
            {
                type: 'Assertion',
                assertion: 'Line Boundary',
                atBeginning: false,
                location: [9,10]
            }
        ]
    ], [
        /(.)(.)\02/,
        [
            capturedSingleAnyChar(1),
            capturedSingleAnyChar(4),
            {
                type: 'Specific Char',
                display: '\\02',
                meaning: 'Octal Notation',
                location: [6,9]
            }
        ]
    ], [
        /(.)(.)\1{2}/,
        [
            capturedSingleAnyChar(1),
            capturedSingleAnyChar(4),
            {
                type: 'Back Reference',
                number: 1,
                quantifier: {
                    min: 2,
                    max: 2,
                    greedy: true,
                    location: [8,11]
                },
                location: [6,11]
            }
        ]
    ]

    /* above come from the spec tester */

    , [
        /* this tests postParse */
        /a\1234\98z/,
        [
            {
                type: 'Specific Char',
                display: 'a',
                location: [0,1]
            },
            {
                type: 'Specific Char',
                display: '\\123',
                meaning: 'Octal Notation',
                location: [1,5]
            },
            {
                type: 'Specific Char',
                display: '4',
                location: [5,6]
            },
            {
                type: 'Specific Char',
                display: '9',
                location: [6,8]
            },
            {
                type: 'Specific Char',
                display: '8',
                location: [8,9]
            },
            {
                type: 'Specific Char',
                display: 'z',
                location: [9,10]
            }
        ]
    ], [
        /[\129]/,
        [
            {
                type: 'Set of Chars',
                inclusive: true,
                possibilities: [
                    {
                        type: 'Specific Char',
                        display: '\\12',
                        meaning: 'Octal Notation',
                        location: [1,4]
                    },
                    {
                        type: 'Specific Char',
                        display: '9',
                        location: [4,5]
                    }
                ],
                location: [0,6]
            }
        ]
    ],
    [
        /[\400]/,
        [
            {
                type: 'Set of Chars',
                inclusive: true,
                possibilities: [
                    {
                        type: 'Specific Char',
                        display: '\\40',
                        meaning: 'Octal Notation',
                        location: [1,4]
                    },
                    {
                        type: 'Specific Char',
                        display: '0',
                        location: [4,5]
                    }
                ],
                location: [0,6]
            }
        ]
    ],
    [
        /* tests location of quantified decimals */
        /\1289{3,}?7/,
        [
            {
                type: 'Specific Char',
                display: '\\12',
                meaning: 'Octal Notation',
                location: [0,3]
            },
            {
                type: 'Specific Char',
                display: '8',
                location: [3,4]
            },
            {
                type: 'Specific Char',
                display: '9',
                quantifier: {
                    min: 3,
                    max: Infinity,
                    greedy: false,  
                    location: [5,10]
                },
                location: [4,10]
            },
            {
                type: 'Specific Char',
                display: '7',
                location: [10,11]
            }
        ]
    ]
]

function runOne(regex, terms) {
    function stringify(o) {
        return JSON.stringify(o, null, 4)
    }

    var src = regex.source
    var exp = disjunction(terms)
    var act = parser.parse(src)
    var success = _.isEqual(act, exp, function(act, exp){
        delete act.hint // not comparing hints
        if (act.alternatives || act.terms || act.grouped) {
            delete act.location // lazy - compare locations of terms and their children only
        }

        if (typeof act === 'object'
                && Object.keys(act).length !== Object.keys(exp).length) {
            debugger // keep this debugger - it's useful
        }
    })
    if (success) {
        console.info(success, src)
    } else {
        act = stringify(act)
        exp = stringify(exp)
        // node's console needs String(boolean) for the first arg, or \n in json doesn't work?
        console.error(String(success), src, act, exp)
    }
}
_.each(specs, function(params) {
    runOne.apply(null, params)
})
console.info('done testing parser')
