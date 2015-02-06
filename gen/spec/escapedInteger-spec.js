// sanity check on back/forward references. Concludes that refs are not sane.

function runOne(str, regex, expected, msg) {
    var matched = str.match(regex)
    function arrayEq(a, b) {
        if (! (a instanceof Array)) {
            return a === b
        }
        if (a.length !== b.length) {
            return false
        }
        return a.every(function(aa, i) {
            return aa === b[i]
        })
    }
    var success = arrayEq(str.match(regex), expected)
    console[success ? 'info' : 'error'](success, msg)
}

var specs = [
 ['\u0001' + '\u0002' + '8', /\128/, null,
    'decimal escape does not match with only one decimal']
,['\12' + '8', /\128/, ['\12' + '8'],
    'decimal escape matches with the longest valid octal notation, just like string.']

,['\377', /\377/, ['\377'],
    '377 is octal']
,['\40' + '0', /\400/, ['\40' + '0'],
    '400 is octal then char']
,['400', /^\400$/, null,
    '400 is not all chars']

,['qww', /(.)(.)[\2]/, null,
    'escaped decimal digits are never a backref inside a class']
,['qww', /(.)(.)\2/, ['qww', 'q', 'w'],
    'escaped decimal digits can be a backref outside a class']

,['qq', /(.)\0/, null,
    '0 is not a backref to group 1']
,['qq', /()\0/, null,
    '0 is not a backref to group 1 that captures an empty string']
,['q\u0000', /(.)\0/, ['q\u0000', 'q'],
    '0 is octal']

,['qqq', /(.)\2/, null,
    'number is not a backref if a group of that number doesn\'t exist']
,['q\u0002', /(.)\2/, ['q\u0002', 'q'],
    'number is octal if a group of that number doesn\'t exist']
,['qw\u0002', /(.)(.)\2/, null,
    'backref takes precedence over octal']

,['qww', /^(q)\2(w)$/, null,
    'forwardref always matches with an empty string, b/c the group will never have been captured by the time the ref is expected']
,['qw', /^(q)\2(w)$/, ['qw', 'q', 'w'],
    'ditto above']
,['abcb', /c\1|a(b)z/, ['c', undefined],
    'even when a fowardref group ought to have been captured b/c it was traversed, it is not captured']
,['q\u0002w', /(q)\2(w)/, null,
    'forwardref takes precedence over octal']

,['qw', /^(q)(\3)(w)$/, ['qw', 'q', '', 'w'],
    'backref itself can be in a group']
,['qwqwer', /(er)|(qw)(\2)/, ['qwqw', undefined, 'qw', 'qw'],
    'captured group number spans across all Alternatives. (also, matches are based on earliest appearance in string, not earliest Alternative in regex.)']
,['qwqwer', /(er)|(qw)(\1)/, ['qw', undefined, 'qw', ''],
    'backref refers to a group that has never been captured at the point the backref is expected. Therefore it fails and matches with an empty string.']
,['qwer', /(qw(\3))|(er)/, ['qw', 'qw', '', undefined],
    'ditto above']
,['qq', /(.)(w|\1)/, ['qq', 'q', 'q'],
    'backref refers to the already matched group 1']

,['qww', /(.)(.)\02/, null,
    'backref cannot start with digit 0']
,['qw\u0002', /(.)(.)\02/, ['qw\u0002', 'q', 'w'],
    'escaped decimals that starts with digit 0 is octal']

,['qwqq', /(.)(.)\1{2}/, ['qwqq', 'q', 'w'],
    'backref works with quantifier']
]

specs.forEach(function(params) {
    runOne.apply(null, params)
})
console.info('done spec')
