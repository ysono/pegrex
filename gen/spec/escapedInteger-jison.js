var _ = require('lodash')
var parser = require('../parser')

function disjunction(terms) {
    return {
        alternatives: [
            {
                terms: terms
            }
        ]
    }
}
function capturedSingleAnyChar() {
    return {
        type: 'Group',
        isCapturing: true,
        grouped: disjunction([
            {
                type: 'Any Char'
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
                meaning: 'Octal Notation'
            },
            {
                type: 'Specific Char',
                display: '8'
            }
        ]
    ], [
        /\377/,
        [
            {
                type: 'Specific Char',
                display: '\\377',
                meaning: 'Octal Notation'
            }
        ]
    ], [
        /\400/,
        [
            {
                type: 'Specific Char',
                display: '\\40',
                meaning: 'Octal Notation'
            },
            {
                type: 'Specific Char',
                display: '0'
            }
        ]
    ], [
        /(.)(.)[\2]/,
        [
            capturedSingleAnyChar(),
            capturedSingleAnyChar(),
            {
                type: 'Set of Characters',
                possibilities: [
                    {
                        type: 'Specific Char',
                        display: '\\2',
                        meaning: 'Octal Notation'
                    }
                ]
            }
        ]
    ], [
        /(.)(.)\2/,
        [
            capturedSingleAnyChar(),
            capturedSingleAnyChar(),
            {
                type: 'Back Reference',
                number: 2
            }
        ]
    ], [
        /(.)\0/,
        [
            capturedSingleAnyChar(),
            {
                type: 'Specific Char',
                display: '\\0',
                meaning: 'Octal Notation'
            }
        ]
    ], [
        /()\0/,
        [
            {
                type: 'Group',
                isCapturing: true,
                grouped: disjunction([])
            },
            {
                type: 'Specific Char',
                display: '\\0',
                meaning: 'Octal Notation'
            }
        ]
    ], [
        /(.)\2/,
        [
            capturedSingleAnyChar(),
            {
                type: 'Specific Char',
                display: '\\2',
                meaning: 'Octal Notation'
            }
        ]
    ], [
        /(.)(.)\2/,
        [
            capturedSingleAnyChar(),
            capturedSingleAnyChar(),
            {
                type: 'Back Reference',
                number: 2
            }
        ]
    ], [
        /^(q)\2(w)$/,
        [
            {
                type: 'Assertion',
                assertion: 'Line Boundary',
                atBeginning: true,                
            },
            {
                type: 'Group',
                isCapturing: true,
                grouped: disjunction([
                    {
                        type: 'Specific Char',
                        display: 'q'
                    }
                ])
            },
            {
                type: 'Forward Reference',
                number: 2
            },
            {
                type: 'Group',
                isCapturing: true,
                grouped: disjunction([
                    {
                        type: 'Specific Char',
                        display: 'w'
                    }
                ])
            },
            {
                type: 'Assertion',
                assertion: 'Line Boundary',
                atBeginning: false
            }
        ]
    ], [
        /(.)(.)\02/,
        [
            capturedSingleAnyChar(),
            capturedSingleAnyChar(),
            {
                type: 'Specific Char',
                display: '\\02',
                meaning: 'Octal Notation'
            }
        ]
    ], [
        /(.)(.)\1{2}/,
        [
            capturedSingleAnyChar(),
            capturedSingleAnyChar(),
            {
                type: 'Back Reference',
                number: 1,
                quantifier: {
                    min: 2,
                    max: 2,
                    greedy: true
                }
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
                display: 'a'
            },
            {
                type: 'Specific Char',
                display: '\\123',
                meaning: 'Octal Notation'
            },
            {
                type: 'Specific Char',
                display: '4'
            },
            {
                type: 'Specific Char',
                display: '9'
            },
            {
                type: 'Specific Char',
                display: '8'
            },
            {
                type: 'Specific Char',
                display: 'z'
            }
        ]
    ], [
        /[\129]/,
        [
            {
                type: 'Set of Characters',
                possibilities: [
                    {
                        type: 'Specific Char',
                        display: '\\12',
                        meaning: 'Octal Notation'
                    },
                    {
                        type: 'Specific Char',
                        display: '9'
                    }
                ]
            }
        ]
    ],
    [
        /[\400]/,
        [
            {
                type: 'Set of Characters',
                possibilities: [
                    {
                        type: 'Specific Char',
                        display: '\\40',
                        meaning: 'Octal Notation'
                    },
                    {
                        type: 'Specific Char',
                        display: '0'
                    }
                ]
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
    })
    if (success) {
        console.info(src, success)
    } else {
        act = stringify(act)
        exp = stringify(exp)
        console.error(src, success, act, exp)
    }
}
_.each(specs, function(params) {
    runOne.apply(null, params)
})
