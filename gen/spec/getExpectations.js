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
                    type: 'anyChar'
                }
            },
            provide.AtomEscape()
        )
    },
    PatternCharacter: function(){
        return ['a','b','0','8',':',']'].reduce(function(map, c){
            map[c] = {
                type: 'specificChar',
                val: c
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
                type: 'escapedInteger',
                val: str // no processing done; expecting whole decimals
            }
            return map
        }, {})
    },
    CharacterEscape: function(){
        
    },
    CharacterClassEscape: function(){
        return {
            'd': {
                type: 'digitChar'
            },
            'S': {
                type: 'notWhitespaceChar'
            }
        }
    }
}
debugger
module.exports = provide.Pattern
