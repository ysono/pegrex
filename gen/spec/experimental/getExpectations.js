var _ = require('lodash')

function combineUniqueExps() {
    var args = Array.prototype.slice.call(arguments).concat(
        function(existing, additional) {
            if (existing != null) {
                throw 'duplicate test string for the same rule'
            }
            return additional
        }
    )
    return _.assign.apply(_, args)
}

function interlace(singles) {
    // singles is a map of str to exp

    var singleStrs = Object.keys(singles)

    var doubles = (function(singleStrs) {
        var map = {}
        var i,j, str0,str1,exp
        for(i = 0; i < singleStrs.length; i++) {
            for(j = 0; j < singleStrs.length; j++) {
                str0 = singleStrs[i]
                str1 = singleStrs[j]
                map[str0 + str1] = [singles[str0], singles[str1]]
                // e.g. 'ab' maps to [{type: ...}, {type: ...}]
            }
        }
    })(singleStrs.slice(0, 3)) // arbitrary restrict interlace size

    // for singles we expect results to be arrays too
    singles = _.reduce(singles, function(map, exp, str) {
        map[str] = [exp]
        return map
    }, {})

    return _.assign(singles, doubles)
}

var provide = {
    Pattern: function() {
        return provide.Disjunction()
    },
    Disjunction: function() {
        return _.reduce(provide.Alternatives(), function(map, exp, str) {
            map[str] = {
                type: 'Disjunction',
                alternatives: exp
            }
            return map
        }, {})
    },
    Alternatives: function() {
        return interlace(provide.Alternative())
    },
    Alternative: function() {
        return _.reduce(provide.Terms(), function(map, exp, str) {
            map[str] = {
                type: 'Alternative',
                terms: exp
            }
            return map
        }, {})
    },
    Terms: function() {
        return interlace(provide.Term())
    },
    Term: function() {
        return provide.Atom()
    },
    Atom: function() {
        return combineUniqueExps(
            provide.PatternCharacter(),
            {
                '.':  {
                    type: 'Any Char',
                    display: '.'
                }
            },
            provide.AtomEscape()
        )
    },
    PatternCharacter: function() {
        return ['a','b','0','8',':',']'].reduce(function(map, c) {
            map[c] = {
                type: 'Specific Char',
                display: c
            }
            return map
        }, {})
    },
    AtomEscape: function() {
        return combineUniqueExps(
            // provide.DecimalEscape(),
            provide.CharacterEscape(),
            provide.CharacterClassEscape()
        )
    },
    // DecimalEscape: function() {
    //     var octals = ['0','7','00','07','70','000','377']
    //     var octalsPlusChars = ['08','78', '008','078','0000','0008','3770','3778']
    //     var chars = ['8','80','88','888','8888']

        
    //     // backrefs are any decimal starting with a [1-9], so they are covered above
    //     var all = octals.concat(octalsPlusChars).concat(chars)
    //     return _.reduce(all, function(map,str) {
    //         map['\\' + str] = {
    //             ESCAPED_INTEGER: true,
    //             decimals: str // no processing done; expecting whole decimals
    //         }
    //         return map
    //     }, {})
    // },
    CharacterEscape: function() {
        var needEscape = {
            'f': 'Form Feed',
            'cA': 'Control Char',
            'cz': 'Control Char',
            'c3': 'Control Char',
            'c_': 'Control Char',
            'u3f9b': 'Hexadecimal Notation',
            'x3f': 'Hexadecimal Notation'
        }
        var identityEscape = [
            'a', '$'
        ]

        needEscape = _.reduce(needEscape, function(map, meaning, unescaped) {
            var escaped = '\\' + unescaped
            map[escaped] = {
                type: 'Specific Char',
                display: escaped,
                meaning: meaning
            }
            return map
        }, {})
        identityEscape = _.reduce(identityEscape, function(map, unescaped) {
            var escaped = '\\' + unescaped
            map[escaped] = {
                type: 'Specific Char',
                display: escaped,
                meaning: 'Unnecessarily escaped'
            }
            return map
        }, {})

        return _.assign(needEscape, identityEscape)
    },
    CharacterClassEscape: function() {
        return {
            '\\d': {
                type: 'Pre-defined Set of Chars',
                display: '\\d',
                meaning: 'Decimal: [0-9]'
            },
            '\\S': {
                type: 'Pre-defined Set of Chars',
                display: '\\S',
                meaning: 'Non-Whitespace'
            }
        }
    }
}

module.exports = provide.Pattern
