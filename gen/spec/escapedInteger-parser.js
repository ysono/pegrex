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
                textLoc: [locBegin+1,locBegin+2]
            }
        ]),
        textLoc: [locBegin,locBegin+3]
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
                textLoc: [0,3]
            },
            {
                type: 'Specific Char',
                display: '8',
                textLoc: [3,4]
            }
        ]
    ], [
        /\377/,
        [
            {
                type: 'Specific Char',
                display: '\\377',
                meaning: 'Octal Notation',
                textLoc: [0,4]
            }
        ]
    ], [
        /\400/,
        [
            {
                type: 'Specific Char',
                display: '\\40',
                meaning: 'Octal Notation',
                textLoc: [0,3]
            },
            {
                type: 'Specific Char',
                display: '0',
                textLoc: [3,4]
            }
        ]
    ], [
        /(.)(.)[\2]/,
        [
            capturedSingleAnyChar(0),
            capturedSingleAnyChar(3),
            {
                type: 'Set of Chars',
                inclusive: true,
                possibilities: [
                    {
                        type: 'Specific Char',
                        display: '\\2',
                        meaning: 'Octal Notation',
                        textLoc: [7,9]
                    }
                ],
                predefined: undefined,
                textLoc: [6,10]
            }
        ]
    ], [
        /(.)(.)\2/,
        [
            capturedSingleAnyChar(0),
            capturedSingleAnyChar(3),
            {
                type: 'Reference',
                number: 2,
                isBack: true,
                textLoc: [6,8]
            }
        ]
    ], [
        /(.)\0/,
        [
            capturedSingleAnyChar(0),
            {
                type: 'Specific Char',
                display: '\\0',
                meaning: 'Octal Notation',
                textLoc: [3,5]
            }
        ]
    ], [
        /()\0/,
        [
            {
                type: 'Group',
                isCapturing: true,
                grouped: disjunction([]),
                textLoc: [0,2]
            },
            {
                type: 'Specific Char',
                display: '\\0',
                meaning: 'Octal Notation',
                textLoc: [2,4]
            }
        ]
    ], [
        /(.)\2/,
        [
            capturedSingleAnyChar(0),
            {
                type: 'Specific Char',
                display: '\\2',
                meaning: 'Octal Notation',
                textLoc: [3,5]
            }
        ]
    ], [
        /(.)(.)\2/,
        [
            capturedSingleAnyChar(0),
            capturedSingleAnyChar(3),
            {
                type: 'Reference',
                number: 2,
                isBack: true,
                textLoc: [6,8]
            }
        ]
    ], [
        /^(q)\2(w)$/,
        [
            {
                type: 'Assertion',
                assertion: 'Line Boundary',
                atBeginning: true,
                textLoc: [0,1]
            },
            {
                type: 'Group',
                isCapturing: true,
                grouped: disjunction([
                    {
                        type: 'Specific Char',
                        display: 'q',
                        textLoc: [2,3]
                    }
                ]),
                textLoc: [1,4]
            },
            {
                type: 'Reference',
                number: 2,
                isBack: false,
                textLoc: [4,6]
            },
            {
                type: 'Group',
                isCapturing: true,
                grouped: disjunction([
                    {
                        type: 'Specific Char',
                        display: 'w',
                        textLoc: [7,8]
                    }
                ]),
                textLoc: [6,9]
            },
            {
                type: 'Assertion',
                assertion: 'Line Boundary',
                atBeginning: false,
                textLoc: [9,10]
            }
        ]
    ], [
        /(.)(.)\02/,
        [
            capturedSingleAnyChar(0),
            capturedSingleAnyChar(3),
            {
                type: 'Specific Char',
                display: '\\02',
                meaning: 'Octal Notation',
                textLoc: [6,9]
            }
        ]
    ], [
        /(.)(.)\1{2}/,
        [
            capturedSingleAnyChar(0),
            capturedSingleAnyChar(3),
            {
                type: 'Quantified',
                quantifier: {
                    min: 2,
                    max: 2,
                    greedy: true,
                    textLoc: [8,11]
                },
                target: {
                    type: 'Reference',
                    number: 1,
                    isBack: true,
                    textLoc: [6,8]
                },
                textLoc: [6,11]
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
                textLoc: [0,1]
            },
            {
                type: 'Specific Char',
                display: '\\123',
                meaning: 'Octal Notation',
                textLoc: [1,5]
            },
            {
                type: 'Specific Char',
                display: '4',
                textLoc: [5,6]
            },
            {
                type: 'Specific Char',
                display: '\\9',
                textLoc: [6,8],
                meaning: 'Unnecessarily escaped'
            },
            {
                type: 'Specific Char',
                display: '8',
                textLoc: [8,9]
            },
            {
                type: 'Specific Char',
                display: 'z',
                textLoc: [9,10]
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
                        textLoc: [1,4]
                    },
                    {
                        type: 'Specific Char',
                        display: '9',
                        textLoc: [4,5]
                    }
                ],
                predefined: undefined,
                textLoc: [0,6]
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
                        textLoc: [1,4]
                    },
                    {
                        type: 'Specific Char',
                        display: '0',
                        textLoc: [4,5]
                    }
                ],
                predefined: undefined,
                textLoc: [0,6]
            }
        ]
    ],
    [
        /* tests textLoc of quantified decimals */
        /\12{3}/,
        [
            {
                type: 'Quantified',
                quantifier: {
                    min: 3,
                    max: 3,
                    greedy: true,
                    textLoc: [3,6]
                },
                target: {
                    type: 'Specific Char',
                    display: '\\12',
                    meaning: 'Octal Notation',
                    textLoc: [0,3]
                },
                textLoc: [0,6]
            }
        ]
    ],
    [
        /* tests textLoc of quantified decimals */
        /\1289{3,}?7/,
        [
            {
                type: 'Specific Char',
                display: '\\12',
                meaning: 'Octal Notation',
                textLoc: [0,3]
            },
            {
                type: 'Specific Char',
                display: '8',
                textLoc: [3,4]
            },
            {
                type: 'Quantified',
                quantifier: {
                    min: 3,
                    max: Infinity,
                    greedy: false,  
                    textLoc: [5,10]
                },
                target: {
                    type: 'Specific Char',
                    display: '9',
                    textLoc: [4,5]
                },
                textLoc: [4,10]
            },
            {
                type: 'Specific Char',
                display: '7',
                textLoc: [10,11]
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
        if (act) {
            delete act.hint // not comparing hints
            if (act.alternatives || act.terms) {
                // lazy - compare locations of terms and their children only
                delete act.textLoc
            }
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
