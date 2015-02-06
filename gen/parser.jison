/*
Resrouces:
- [ECMA](http://www.ecma-international.org/ecma-262/5.1/#sec-15.10)
*/

%lex

%%

/* Terminals made of more than one char */

[0-9]{2,}                   return 'CHARS_DIGIT_DECIMAL'

/* Terminals made of an exact char */

[|]  return '|'
[\^] return '^'
[$]  return '$'
[\\] return '\\'
[(]  return '('
[)]  return ')'
[?]  return '?'
[=]  return '='
[!]  return '!'
[*]  return '*'
[+]  return '+'
[{]  return '{'
[}]  return '}'
[,]  return ','
[\.] return '.'
[\[] return '['
[\]] return ']'
[-]  return '-'
[:]  return ':'
[_]  return '_'

[b]  return 'b'
[B]  return 'B'
[c]  return 'c'
[d]  return 'd'
[D]  return 'D'
[f]  return 'f'
[n]  return 'n'
[r]  return 'r'
[s]  return 's'
[S]  return 'S'
[t]  return 't'
[u]  return 'u'
[v]  return 'v'
[w]  return 'w'
[W]  return 'W'
[x]  return 'x'

<<EOF>> return 'EOF'

/* Terminals made of exactly one char with multiple possibilities */

[0-9]                       return 'CHAR_DIGIT_DECIMAL'
[a-fA-F]                    return 'CHAR_DIGIT_HEX'
[a-zA-Z]                    return 'CHAR_ALPHABET'
/* Control characters are [allowed](http://www.ecma-international.org/ecma-262/5.1/#sec-E) */
.                           return 'CHAR_OTHER'

/lex

%start Pattern

%%

Pattern
    : Disjunction EOF
        {return $1}
    ;
Disjunction
    : Alternative_s
        {$$ = b().withLoc(@1).disjunction($1)}
    ;
Alternative_s
    : Alternative
        {$$ = [$1]}
    | Alternative_s '|' Alternative
        {$$ = $1.concat($3)}
    ;
Alternative
    : Term_s
        {$$ = b().withLoc(@1).alternative($1)}
    ;
Term_s
    /* returns array of whatever valid types are for Term */
    : /* empty */
        {$$ = []}
    | Term_s Term
        {$$ = $1.concat( b().withLoc(@2).get($2) )}
        /* this withLoc covers a whole slew of assertions and atoms */
    ;
Term
    : Assertion
    | Atom
    | Atom Quantifier
        {$$ = b().quantifiedAtom($1, b().withLoc(@2).get($2))}
    ;
Assertion
    /* assertion */
    : '^'
        {$$ = b().assertion('Line Boundary', true)}
    | '$'
        {$$ = b().assertion('Line Boundary', false)}
    | '\\' 'b'
        {$$ = b().assertion('Word Boundary', true)}
    | '\\' 'B'
        {$$ = b().assertion('Word Boundary', false)}
    | '(' '?' '=' Disjunction ')'
        {$$ = b().assertion('Look-Forward', true, $4)}
    | '(' '?' '!' Disjunction ')'
        {$$ = b().assertion('Look-Forward', false, $4)}
    ;
Quantifier
    /* quantifier */
    : QuantifierPrefix
        {$$ = b().quantifier($1, true)}
    | QuantifierPrefix '?'
        {$$ = b().quantifier($1, false)}
    ;
QuantifierPrefix
    /* quantifierRange */
    : '*'
        {$$ = b().quantifierRange(0, Intinify)}
    | '+'
        {$$ = b().quantifierRange(1, Intinify)}
    | '?'
        {$$ = b().quantifierRange(0, 1)}
    | '{' integer '}'
        {$$ = b().quantifierRange($2, $2)}
    | '{' integer ',' '}'
        {$$ = b().quantifierRange($2, Infinity)}
    | '{' integer ',' integer '}'
        {$$ = b().quantifierRange($2, $4)}
    ;
Atom
    /* anyChar or specificChar or specificCharEsc or predefinedCharSet or delayedEscapedInteger or charSet or group */
    : PatternCharacter
        {$$ = b().specificChar($1)}
    | '.'
        {$$ = b().anyChar()}
    | '\\' AtomEscape -> $2
    | CharacterClass
    | '(' Disjunction ')'
        {$$ = b().group(true, $2)}
    | '(' '?' ':' Disjunction ')'
        {$$ = b().group(false, $4)}
    ;

AtomEscape
    /* specificChar or specificCharEsc or predefinedCharSet or delayedEscapedInteger */
    : DecimalDigits
        {$$ = b().delayedEscapedInteger(@1, $1)}
    | CharacterEscape
    | CharacterClassEscape
    ;
CharacterEscape
    /* specificChar or specificCharEsc */
    : ControlEscape
    | 'c' ControlLetter
        {$$ = b().specificCharEsc($1+$2, 'Control Character')}
    | HexEscapeSequence
    | UnicodeEscapeSequence
    | IdentityEscape
        {$$ = b().specificChar($1, 'Unnecessarily escaped')}
    ;
ControlEscape
    /* specificCharEsc */
    : 'f'
        {$$ = b().specificCharEsc($1, 'Form Feed')}
    | 'n'
        {$$ = b().specificCharEsc($1, 'Newline')}
    | 'r'
        {$$ = b().specificCharEsc($1, 'Carriage Return')}
    | 't'
        {$$ = b().specificCharEsc($1, 'Tab')}
    | 'v'
        {$$ = b().specificCharEsc($1, 'Vertical Tab')}
    ;
HexEscapeSequence
    /* specificCharEsc */
    : 'u' HexDigit HexDigit HexDigit HexDigit
        {$$ = b().specificCharEsc($1+$2+$3+$4+$5, 'Hexadecimal Notation')}
    ;
UnicodeEscapeSequence
    /* specificCharEsc */
    : 'x' HexDigit HexDigit
        {$$ = b().specificCharEsc($1+$2+$3, 'Hexadecimal Notation')}
    ;

CharacterClassEscape
    /* predefinedCharSet */
    : 'd'
        {$$ = b().predefinedCharSet($1, 'Digit Char', '[0-9]')}
    | 'D'
        {$$ = b().predefinedCharSet($1, 'Non Digit Char', '[^0-9]')}
    | 's'
        {$$ = b().predefinedCharSet($1, 'Whitespace Char', 'Includes but is not limited to space nbsp \n \r \t \v \f')}
    | 'S'
        {$$ = b().predefinedCharSet($1, 'Non Whitespace Char', 'Complement of \s')}
    | 'w'
        {$$ = b().predefinedCharSet($1, 'Word Char', '[0-9A-Z_a-z]')}
    | 'W'
        {$$ = b().predefinedCharSet($1, 'Non Word Char', '[^0-9A-Z_a-z]')}
    ;

CharacterClass
    /* charSet */
    : '[' ClassRanges ']'
        {$$ = b().charSet($2)}
    ;
ClassRanges
    /* array of specificChar or specificCharEsc or predefinedCharSet or charRange */
    : /* empty */
        {$$ = []}
    | NonemptyClassRanges
    ;
NonemptyClassRanges
    /* array of specificChar or specificCharEsc or predefinedCharSet or charRange */
    : ClassAtom
    | ClassAtom NonemptyClassRangesNoDash
        {$$ = $1.concat($2)}
    | ClassAtom '-' ClassAtom ClassRanges
        {$$ = b().withLoc(@1,@3).charRange($1,$3,$4)}
    ;
NonemptyClassRangesNoDash
    /* array of specificChar or specificCharEsc or predefinedCharSet or charRange */
    : ClassAtom
    | ClassAtomNoDash NonemptyClassRangesNoDash
        {$$ = $1.concat($2)}
    | ClassAtomNoDash '-' ClassAtom ClassRanges
        {$$ = b().withLoc(@1,@3).charRange($1,$3,$4)}
    ;
ClassAtom
    /* array of specificChar or specificCharEsc or predefinedCharSet */
    : '-'
        {$$ = [b().withLoc(@1).specificChar($1)]}
    | ClassAtomNoDash
    ;
ClassAtomNoDash
    /* array of specificChar or specificCharEsc or predefinedCharSet */
    : ClassAtomNoDash_single
        {$$ = [b().withLoc(@1).specificChar($1)]}
    | '\\' ClassEscape
        {$$ = [].concat(b().withLoc(@1,@2).get($2))}
    ;
ClassEscape
    /* specificChar or specificCharEsc or predefinedCharSet or array thereof */
    : DecimalDigits
        {$$ = b().escapedInteger(@1, $1)}
    | 'b'
        {$$ = b().specificCharEsc($1, 'Backspace')}
    | CharacterEscape
    | CharacterClassEscape
    ;


integer
    : DecimalDigits
        {$$ = Number($1)}
    ;


/* Rules that depend on
Terminals made of exactly one char with multiple possibilities */

DecimalDigits
    : CHARS_DIGIT_DECIMAL
    | CHAR_DIGIT_DECIMAL
    ;
PatternCharacter
    /*
    spec says not ^ $ \ . * + ? ( ) [ ] { } |
    but allowing ] } because it works with major browsers
    */
    : '='
    | '!'
    | '}'
    | ','
    | ']'
    | '-'
    | ':'
    | '_'
    | 'b'
    | 'B'
    | 'c'
    | 'd'
    | 'D'
    | 'f'
    | 'n'
    | 'r'
    | 's'
    | 'S'
    | 't'
    | 'u'
    | 'v'
    | 'w'
    | 'W'
    | 'x'
    | CHAR_DIGIT_DECIMAL
    | CHAR_DIGIT_HEX
    | CHAR_ALPHABET
    | CHAR_OTHER
    ;
ClassAtomNoDash_single
    /* not \ ] - */
    : '|'
    | '^'
    | '$'
    | '('
    | ')'
    | '?'
    | '='
    | '!'
    | '*'
    | '+'
    | '{'
    | '}'
    | ','
    | '.'
    | '['
    | ':'
    | '_'
    | 'b'
    | 'B'
    | 'c'
    | 'd'
    | 'D'
    | 'f'
    | 'n'
    | 'r'
    | 's'
    | 'S'
    | 't'
    | 'u'
    | 'v'
    | 'w'
    | 'W'
    | 'x'
    | CHAR_DIGIT_DECIMAL
    | CHAR_DIGIT_HEX
    | CHAR_ALPHABET
    | CHAR_OTHER
    ;
ControlLetter
    /* ecma says [A-Za-z] but major browsers also allow _ and [0-9]
        E.g. see [Webkit](https://github.com/WebKit/webkit/blob/master/Source/JavaScriptCore/yarr/YarrParser.h) Parser::parseEscape */
    : '_'
    | 'b'
    | 'B'
    | 'c'
    | 'd'
    | 'D'
    | 'f'
    | 'n'
    | 'r'
    | 's'
    | 'S'
    | 't'
    | 'u'
    | 'v'
    | 'w'
    | 'W'
    | 'x'
    | CHAR_DIGIT_DECIMAL
    | CHAR_DIGIT_HEX
    | CHAR_ALPHABET
    ;
HexDigit
    : 'b'
    | 'B'
    | 'c'
    | 'd'
    | 'D'
    | 'f'
    | CHAR_DIGIT_DECIMAL
    | CHAR_DIGIT_HEX
    ;
IdentityEscape
    /* Note that this ia a hand-waving approximation that matches with way more characters than intended by the spec. We're adding just enough exclusion to avoid ambiguity in grammar. */
    /* not (any other beginning char of AtomEscape)
        i.e. not (any digit) or (any special alphabet) */
    : '|'
    | '^'
    | '$'
    | '\\'
    | '('
    | ')'
    | '?'
    | '='
    | '!'
    | '*'
    | '+'
    | '{'
    | '}'
    | ','
    | '.'
    | '['
    | ']'
    | '-'
    | ':'
    | '_'
    | CHAR_DIGIT_HEX
    | CHAR_ALPHABET
    | CHAR_OTHER
    ;


%%

// this helper needs to be fn literal b/c it's defined after `var parser`
function b() {
    var builders = {
        withLoc: function(begin, end) {
            function assign(o) {
                if (o instanceof Array) {
                    // The concept of location is valid with one token only.
                    // Not an error if token can be an array or an obj
                    // e.g. ClassEscape
                    return o
                }
                o.location = [
                    begin.first_column,
                    (end || begin).last_column
                ]
                return o
            }
            var augmented = Object.keys(builders).reduce(function(map, key) {
                map[key] = function() {
                    var token = builders[key].apply(this, arguments)
                    return assign(token)
                }
                return map
            }, {})
            augmented.get = assign
            return augmented
        },

        disjunction: function(alts) {
            var result = {
                alternatives: alts
            }
            if (alts.length > 1) {
                result.hint = 'ECMA specifies right-recursive, but in practice, all major browsers appear to use all Alternatives concurrently for the earliest match in string.'
            }
            return result
        },
        alternative: function(terms) {
            var result = {
                terms: terms
            }
            if (! terms.length) {
                result.hint = 'Matches zero-length string.'
            }

            // we will revisit each array of terms, parsing and expanding
            // any `delayedEscapedInteger` item the array contains
            (parser.yy.terms_s = parser.yy.terms_s || [])
                .push(terms)

            return result
        },

        assertion: function(key, etc0, etc1) {
            var map = {
                'Line Boundary': function() {
                    var atBeg = etc0
                    var prepo = atBeg ? 'after' : 'before'
                    var char0 = atBeg ? 'beginning of string' : 'end of string'
                    var charlist = [char0].concat([
                        'newline (\\n)',
                        'carriage return (\\r)',
                        'line separator',
                        'paragraph separator'
                    ])
                    var hint = [
                        'Matches the zero-length string ',
                        prepo,
                        ' a new line char, i.e. one of [',
                        String(charlist),
                        ']'
                    ].join('')
                    return {
                        atBeginning: atBeg,
                        hint: hint
                    }
                },
                'Word Boundary': function() {
                    var atWb = etc0
                    var hint = atWb
                        ? '(a word char (\\w)) and (a non-word char (\\W) or the beginning or the end of a line")'
                        : 'a word char (\\w) and a word char (\\w)'
                    hint = 'Matches the zero-length string between ' + hint

                    return {
                        atBoundary: atWb,
                        hint: hint
                    }
                },
                'Look-Forward': function() {
                    var isPos = etc0
                    var disj = etc1
                    return {
                        isPositive: isPos,
                        group: builders.group(false, disj)
                    }
                }
            }
            var result = map[key]()
            result.type = 'Assertion'
            result.assertion = key
            return result
        },

        anyChar: function() {
            return {
                type: 'Any Char'
            }
        },
        specificChar: function(display, hint) {
            return {
                type: 'Specific Char',
                display: display,
                hint: hint
            }
        },
        specificCharEsc: function(unescaped, meaning) {
            return {
                type: 'Specific Char',
                display: '\\' + unescaped,
                meaning: meaning
            }
        },

        escapedInteger: function(loc, decimals) {
            /* returns array of specificChar or specificCharEsc */

            var loc0 = loc.first_column
            var loc1 = loc.last_column
            var octEndWrtDecimals
            var locEndOfFirstChar

            // piggy back on string literal evaluation.
            // the first 1 to 3 chars could be octal.
            var evalled = eval("'\\" + decimals + "'")
            var parsed
            if (evalled === decimals) {
                locEndOfFirstChar = loc0 + 1
                parsed = [
                    builders
                        .withLoc({
                            first_column: loc0 - 1, // -1 for the '\\'
                            last_column: locEndOfFirstChar
                        })
                        .specificChar(evalled[0], 'Unnecessarily escaped')
                ]
            } else {
                octEndWrtDecimals = decimals.length - evalled.length + 1
                locEndOfFirstChar = loc0 + octEndWrtDecimals
                parsed = [
                    builders
                        .withLoc({
                            first_column: loc0 - 1, // -1 for the '\\'
                            last_column: locEndOfFirstChar
                        })
                        .specificCharEsc(
                            decimals.slice(0, octEndWrtDecimals),
                            'Octal Notation')
                ]
            }
            return parsed.concat(evalled.slice(1).split('').map(function(c, i) {
                return builders
                    .withLoc({
                        first_column: locEndOfFirstChar + i,
                        last_column: locEndOfFirstChar + i + 1
                    })
                    .specificChar(c)
            }))
        },
        delayedEscapedInteger: function(loc, decimals) {
            // delay parsing till all capturing groups have been found.
            var result = {
                type: 'delayedEscapedInteger',
                unparsed: decimals,
                backrefNumMax: parser.yy.numCapturedGroups || 0,
                loc: loc
            }
            return result
        },
        escapedIntegerMaybeRef: function(delayed) {
            /* parses delayedEscapedInteger
                and returns array of
                (backRef or fwdRef or specificChar or specificCharEsc)
            */

            function backRef(number) {
                return {
                    type: 'Back Reference',
                    number: number
                }
            }
            function fwdRef(number) {
                return {
                    type: 'Forward Reference',
                    number: number,
                    hint: '[ecma](http://www.ecma-international.org/ecma-262/5.1/#sec-15.10.2.9) does not support the concept of "forward reference, but implementations in major browsers match with a zero-length string'
                }
                // e.g. in webkit src, `PatternTerm::TypeForwardReference` does not have any matching behavior associated.
            }

            var contained = (function(decimals, backrefNumMax, loc) {
                // This whole logic is not covered by [ecma](http://www.ecma-international.org/ecma-262/5.1/#sec-15.10.2.9) but is consistent with major browsers.
                // e.g. see [Webkit](https://github.com/WebKit/webkit/blob/master/Source/JavaScriptCore/yarr/YarrParser.h)  Parser::parseEscape

                var int = Number(decimals)
                var ref
                if (decimals[0] > '0' &&
                        int <= (parser.yy.numCapturedGroups || 0)
                        ) {
                    // only then could it be fwd or back ref
                    if (int > backrefNumMax) {
                        ref = fwdRef(int)
                    } else {
                        ref = backRef(int)
                    }
                    return [
                        builders.withLoc({
                            first_column: loc.first_column - 1, // -1 for the '\\'
                            last_column: loc.first_column + 1
                        }).get(ref)
                    ]
                } else {
                    return builders.escapedInteger(loc, decimals)
                }
            })(delayed.unparsed, delayed.backrefNumMax, delayed.loc)

            if (delayed.quantifier) {
                builders.quantifiedAtom(contained.slice(-1)[0], delayed.quantifier)
            }

            return contained
        },

        quantifiedAtom: function(atom, quantifier) {
            atom.quantifier = quantifier
            if (atom.location) {
                atom.location[1] = quantifier.location[1]
            }
            return atom
        },
        quantifier: function(quantifierRange, greedy) {
            quantifierRange.greedy = greedy
            return quantifierRange
        },
        quantifierRange: function(min, max) {
            var result = {
                min: min,
                max: max
            }
            if (min > max) {
                result.error = 'Repetition range must be specified in the increasing order of numbers'
            }
            return result
        },

        charRange: function(before, after, beyond) {
            // all 3 args are arrays of specificChar or specificCharEsc
            return before.slice(0, -1)
                .concat(
                    (function() {
                        var begin = before.slice(-1)[0].display
                        var end = after[0].display
                        var range = {
                            type: 'Range of Characters',
                            begin: begin,
                            end: end
                        }
                        if (begin.charCodeAt(0) - end.charCodeAt(0) < 0) {
                            range.error = 'Char range must be specified in the increasing order of unicode values'
                        }
                        return range
                    })()
                )
                .concat(after.slice(1))
                .concat(beyond)
        },
        charSet: function(items) {
            var inclusive = true
            if (items[0]
                    && items[0].type === 'Specific Char'
                    && items[0].display === '^') {
                inclusive = false
                items = items.slice(1)
            }
            var result = {
                type: 'Set of Characters',
                possibilities: items,
                inclusive: inclusive
            }
            if (! items.length) {
                result.hint = inclusive
                    ? 'Since this attempts to match with nothing, rather than an empty string, the whole regex will not match with anything.'
                    : 'This matches with any single character "barring none".'
            }
            return result
        },
        predefinedCharSet: function(unescaped, meaning, hint) {
            return {
                type: 'Pre-defined Set of Characters',
                display: '\\' + unescaped,
                meaning: meaning,
                hint: hint
            }
        },

        group: function(isCapturing, grouped) {
            if (isCapturing) {
                parser.yy.numCapturedGroups = (parser.yy.numCapturedGroups || 0) + 1
            }
            return {
                type: 'Group',
                isCapturing: isCapturing,
                grouped: grouped
            }
        }
    } // end of var builders
    return builders
}

parser.parse = (function(orig) {
    function postParse() {
        function splice(arr, index, replacement) {
            var args = [index, 1].concat(replacement)
            Array.prototype.splice.apply(arr, args)
        }

        parser.yy.terms_s.forEach(function(terms) {
            var i, term
            // `.length` is re-read for every loop
            for(i = 0; i < terms.length; i++) {
                term = terms[i]
                if(term.type === 'delayedEscapedInteger') {
                    // no need to adjust i
                    // b/c the replacement array is at least as long
                    // as the length of 1 being spliced away.
                    splice(terms, i, b().escapedIntegerMaybeRef(term))
                }
            }
        })
        // reset b/c these values make parser stateful
        parser.yy.terms_s.length = 0
        parser.yy.numCapturedGroups = 0
    }
    return function() {
        var parsed = orig.apply(this, arguments)
        postParse()
        return parsed
    }
})(parser.parse)
