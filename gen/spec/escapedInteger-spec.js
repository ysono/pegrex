// sanity check on back/forward references. Concludes that refs are not sane.

function charFromOctal(octal) {
    var decimal = parseInt(octal, 8)
    return String.fromCharCode(decimal)
}

function runOne(str, regex, isMatch, msg, expectedTerms) {
    var success = !! str.match(regex) === isMatch
    console[success ? 'info' : 'error'](success, msg)
}

var specs = [
 [charFromOctal(1) + charFromOctal(2) + '8', /\128/, false, 'decimal escape does not match with only one decimal']
,[charFromOctal(12) + '8', /\128/, true, 'decimal escape matches with the longest valid octal notation, just like string.'
    + ' apparently ff started it - see webkit src -> YarrParser.h -> Parser::parseEscape']

,[charFromOctal(377), /\377/, true, '377 is octal']
,[charFromOctal(400), /\400/, false, '400 is not octal']
,['400', /^\400$/, false, '400 is not all chars']
,[charFromOctal(40) + '0', /^\400$/, true, '400 is octal then char']

,['qww', /(.)(.)[\2]/, false, 'escaped decimal digits are never a backref inside a class']
,['qww', /(.)(.)\2/, true, 'escaped decimal digits can be a backref outside a class']

,['qq', /(.)\0/, false, '0 is not a backref to group 1']
,['qq', /()\0/, false, '0 is not a backref to group 1 that captures an empty string']
,['q\u0000', /(.)\0/, true, '0 is octal']

,['qqq', /(.)\2/, false, 'number is not a backref if a group of that number doesn\'t exist']
,['q\u0002', /(.)\2/, true, 'number is octal if a group of that number doesn\'t exist']
,['qw\u0002', /(.)(.)\2/, false, 'backref takes precedence over octal']

,['qww', /^(q)\2(w)$/, false, 'forwardref does NOT match what the group matches']
,['qw', /^(q)\2(w)$/, true, 'forwardref always matches with an empty string (though ecma says behavior undefined).'
    + ' e.g. in webkit src, PatternTerm::TypeForwardReference does not have any matching behavior associated.']
,['q\u0002w', /(q)\2(w)/, false, 'forwardref takes precedence over octal']

,['qww', /(.)(.)\02/, false, 'backref cannot start with digit 0']
,['qw\u0002', /(.)(.)\02/, true, 'decimal that starts with digit 0 is octal']

,['qwqq', /(.)(.)\1{2}/, true, 'backref works with quantifier']
]

specs.forEach(function(params) {
    runOne.apply(null, params)
})
