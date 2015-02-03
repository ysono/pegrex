var _ = require('lodash')

function combineExps(){
    var args = Array.prototype.slice.call(arguments).concat(
        function(existing, additional){
            if (existing != null) {
                throw 'duplicate test string for the same rule'
            }
            return additional
        }
    )
    return _.assign.apply(_, args)
}

var provide = {
    Pattern: function(){
        return provide.Disjunction()
    },
    Disjunction: function(){
        return _.reduce(provide.Alternative(), function(map, exp, str){
            map[str] = {alternatives: [exp]}
            return map
        }, {})
    },
    Alternative: function(){
        return _.reduce(provide.Term(), function(map, exp, str){
            map[str] = {terms: [exp]}
            return map
        }, {})
    },
    Term: function(){
        return provide.Atom()
    },
    Atom: function(){
        return combineExps(
            provide.PatternCharacter(),
            {
                '.':  {
                    type: 'singleChar',
                    label: 'Any Char',
                    display: '.'
                }
            },
            provide.AtomEscape()
        )
    },
    PatternCharacter: function(){
        return ['a','b','0','8',':',']'].reduce(function(map, c){
            map[c] = {
                type: 'singleChar',
                label: 'Specific Char',
                display: c
            }
            return map
        }, {})
    },
    AtomEscape: function(){
        var escaped = combineExps(
            provide.DecimalEscape(),
            provide.CharacterEscape(),
            provide.CharacterClassEscape()
        )
        return _.reduce(escaped, function(map, exp, str){
            map['\\' + str] = exp
            return map
        }, {})
    },
    DecimalEscape: function(){
        var octals = ['0','7','00','07','70','000','377']
        var octalsPlusChars = ['08','78', '008','078','0000','0008','3770','3778']
        var chars = ['8','80','88','888','8888']
        // backrefs are any decimal starting with a [1-9], so they are covered above
        var all = octals.concat(octalsPlusChars).concat(chars)
        return _.reduce(all, function(map,str){
            map[str] = {
                type: 'singleChar',
                ESCAPED_INTEGER: true,
                decimals: str // no processing done; expecting whole decimals
            }
            return map
        }, {})
    },
    CharacterEscape: function(){
        function getExp(display) {
            return {
                type: 'singleChar',
                label: 'Specific Char',
                display: display
            }
        }
        return {
            'f': getExp('f'),
            'cA': getExp('cA'),
            'cz': getExp('cz'),
            'u3f9b': getExp('0x3f9b'),
            'x3f': getExp('0x3f'),
            '$': getExp('$') // TODO more IdentityEscape
        }
    },
    CharacterClassEscape: function(){
        return {
            'd': {
                type: 'singleChar',
                label: 'Digit Char'
            },
            'S': {
                type: 'singleChar',
                label: 'Non Whitespace Char'
            }
        }
    }
}
debugger
module.exports = provide.Pattern
