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
        {$$ = b().disjunction($1)}
    ;
Alternative_s
    : Alternative
        {$$ = [$1]}
    | Alternative_s '|' Alternative
        {$$ = $1.concat($3)}
    ;
Alternative
    : Term_s
        {$$ = b().alternative($1)}
    ;
Term_s
    /* returns array of whatever valid types are for Term */
    : /* empty */
        {$$ = []}
    | Term_s Term
        {$$ = $1.concat($2)}
    ;
Term
    : Assertion
    | Atom
    | Atom Quantifier
        {$$ = b().quantifiedAtom($1, $2)}
        /* TODO test is $1 array? */
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
    /* anyChar or specificChar or specificCharEsc or delayedEscapedInteger or charSet or group */
    : PatternCharacter
        {$$ = b().specificChar($1)}
    | '.'
        {$$ = b().anyChar()}
    | '\\' AtomEscape -> $2
    | CharacterClass
    | '(' Disjunction ')'
        {{
        $$ = b().group(true, $2)
        // TODO test
        yy.numCapturedGroups = (yy.numCapturedGroups || 0) + 1
        }}
    | '(' '?' ':' Disjunction ')'
        {$$ = b().group(false, $4)}
    ;

AtomEscape
    /* specificChar or specificCharEsc or delayedEscapedInteger */
    : DecimalDigits
        {$$ = b().delayedEscapedInteger($1)}
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
        {$$ = b().specificChar(yytext, 'Hexadecimal Notation')}
    ;
UnicodeEscapeSequence
    /* specificCharEsc */
    : 'x' HexDigit HexDigit
        {$$ = b().specificChar(yytext, 'Hexadecimal Notation')}
    ;

CharacterClassEscape
    /* specificCharEsc */
    : 'd'
        {$$ = b().specificCharEsc($1, 'Digit Char', '[0-9]')}
    | 'D'
        {$$ = b().specificCharEsc($1, 'Non Digit Char', '[^0-9]')}
    | 's'
        {$$ = b().specificCharEsc($1, 'Whitespace Char', 'Includes space nbsp \n \r \t \v \f')}
    | 'S'
        {$$ = b().specificCharEsc($1, 'Non Whitespace Char', 'Complement of \s')}
    | 'w'
        {$$ = b().specificCharEsc($1, 'Word Char', '[0-9A-Z_a-z]')}
    | 'W'
        {$$ = b().specificCharEsc($1, 'Non Word Char', '[^0-9A-Z_a-z]')}
    ;

CharacterClass
    /* charSet */
    : '[' ClassRanges ']'
        {$$ = b().charSet($2)}
    ;
ClassRanges
    /* array of specificChar or specificCharEsc or charRange */
    : /* empty */
        {$$ = []}
    | NonemptyClassRanges
    ;
NonemptyClassRanges
    /* array of specificChar or specificCharEsc or charRange */
    : ClassAtom
    | ClassAtom NonemptyClassRangesNoDash
        {$$ = $1.concat($2)}
    | ClassAtom '-' ClassAtom ClassRanges
        {$$ = b().charRange($1,$3,$4)}
    ;
NonemptyClassRangesNoDash
    /* array of specificChar or specificCharEsc or charRange */
    : ClassAtom
    | ClassAtomNoDash NonemptyClassRangesNoDash
        {$$ = $1.concat($2)}
    | ClassAtomNoDash '-' ClassAtom ClassRanges
        {$$ = b().charRange($1,$3,$4)}
    ;
ClassAtom
    /* array of specificChar or specificCharEsc */
    : '-'
        {$$ = [b().specificChar($1)]}
    | ClassAtomNoDash
    ;
ClassAtomNoDash
    /* array of specificChar or specificCharEsc */
    : ClassAtomNoDash_single
        {$$ = [b().specificChar($1)]}
    | '\\' ClassEscape
        {$$ = [].concat($2)}
    ;
ClassEscape
    /* specificChar or specificCharEsc or array thereof */
    : DecimalDigits
        {{
        ;(function(){
            // piggy back on string evaluation. the first 1 to 3 chars could be octal.
            var converted = eval("'\\" + $1 + "'")
            // var numOctChars = (converted === $1) ? 0
            //     : $1.length - converted.length + 1
            var parsed
            if (converted === $1) {
                parsed = [b().specificChar(
                    converted[0], 'Unnecessarily escaped')]
            } else {
                parsed = [b().specifiedCharEsc(
                    $1.slice(0, $1.length - converted.length + 1),
                    'Octal notation')]
            }
            $$ = parsed.concat(converted.slice(1).split('').map(function(c) {
                return b().specificChar(c)
            }))
        })()
        }}
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
    /* TODO same as \w */
    : 'b'
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
    | CHAR_DIGIT_HEX
    | CHAR_ALPHABET
    | CHAR_OTHER
    ;


%%

// this helper needs to be fn literal b/c it's defined after `var parser`
function b() {
    var builders = {
        disjunction: function(alts) {
            var result = {
                alternatives: alts
            }
            if (alts.length) {
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
                    var hint = 'Matches the zero-length string {0} a new line char, i.e. one of [{0}]'
                        .format(prepo, String(charlist))
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
        specificCharEsc: function(unescaped, meaning, hint) {
            escaped = /^\\/.test(unescaped) ? unescaped : '\\' + unescaped
            return {
                type: 'Specific Char',
                display: escaped,
                meaning: meaning,
                hint: hint
            }
            return builders.specificChar(escaped, hint)
        },
        delayedEscapedInteger: function(decimals) {
            // delay parsing till all capturing groups have been found. TODO move quantifier
            return {
                ESCAPED_INTEGER: true,
                decimals: decimals
            }
        },

        quantifiedAtom: function(atom, quantifier) {
            atom.quantifier = quantifier
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
                            type: 'Range of Chars',
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
            var result = {
                type: 'Set of Characters',
                possibilities: items
            }
            if (! items.length) {
                result.hint = 'Since this attempts to match with nothing, rather than an empty string, the whole regex will not match with anything.'
            }
            return result
        },

        group: function(isCapturing, grouped) {
            return {
                type: 'Group',
                isCapturing: isCapturing,
                grouped: grouped
            }
        }
    }
    return builders
}
