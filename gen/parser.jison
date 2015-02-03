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
    : Alternative
        {$$ = {alternatives: [$1]}}
    | Disjunction '|' Alternative
        {{
        $1.alternatives = $1.alternatives.concat($3)
        $1.hint = 'ECMA specifies right-recursive, but in practice, all major browsers appear to use all Alternatives concurrently for the earliest match in string.'
        $$ = $1
        }}
    ;
Alternative
    : /* empty */
        {{
        $$ = {
            terms: [],
            hint: 'Matches zero-length string.'
        }
        }}
    | Alternative Term
        {{
        $1.terms = $1.terms.concat($2)
        delete $1.hint
        $$ = $1
        }}
    ;
Term
    : Assertion
    | Atom
    | Atom Quantifier
        {$1.quantifier = $2; $$ = $1}
    ;
Assertion
    : '^'
        {{
        $$ = {
            type: 'assertion',
            assertion: 'Beginning of Line',
            hint: 'Matches the zero-length string after a new line char, i.e. one of [newline (\\n), carriage return (\\r), line separator (\\u2028), paragraph separator (\\2029)]'
        }
        }}
    | '$'
        {{
        $$ = {
            type: 'assertion',
            assertion: 'End of Line',
            hint: 'Matches the zero-length string before a new line char, i.e. one of [newline (\\n), carriage return (\\r), line separator (\\u2028), paragraph separator (\\2029)]'
        }
        }}
    | '\\' 'b'
        {{
        $$ = {
            type: 'assertion',
            assertion: 'Word Boundary',
            hint: 'Matches the zero-length string between (a word char (\\w)) and (a non-word char (\\W) or the beginning or end of a line")'
        }
        }}
    | '\\' 'B'
        {{
        $$ = {
            type: 'assertion',
            assertion: 'Non Word Boundary',
            hint: 'Matches the zero-length string between a word char (\\w) and a word char (\\w)'
        }
        }}
    | '(' '?' '=' Disjunction ')'
        {{
        $$ = {
            type: 'group',
            role: 'Positive Look-forward',
            grouped: $4
        }
        }}
    | '(' '?' '!' Disjunction ')'
        {{
        $$ = {
            type: 'group',
            role: 'Negative Look-forward',
            grouped: $4
        }
        }}
    ;
Quantifier
    : QuantifierPrefix
        {$1.greedy = true; $$ = $1}
    | QuantifierPrefix '?'
        {$1.greedy = false; $$ = $1}
    ;
QuantifierPrefix
    : '*'
        {$$ = {min: 0, max: Infinity}}
    | '+'
        {$$ = {min: 1, max: Infinity}}
    | '?'
        {$$ = {min: 0, max: 1}}
    | '{' integer '}'
        {$$ = {min: $2, max: $2}}
    | '{' integer ',' '}'
        {$$ = {min: $2, max: Infinity}}
    | '{' integer ',' integer '}'
        {$$ = {min: $2, max: $4}}
    ;
Atom
    /*
    for PatternCharacter, dot, and AtomEscape, except (AtomEscape -> DecimalDigits) :
    {
        type: 'singleChar'
        label: // required
        display: // required
    }
    */
    : PatternCharacter
        {$$ = {type: 'singleChar', label: 'Specific Char', display: $1}}
    | '.'
        {$$ = {type: 'singleChar', label: 'Any Char', display: '.'}}
    | '\\' AtomEscape
        {$2.type = 'singleChar'; $$ = $2}
    | CharacterClass
        /* TODO */
    | '(' Disjunction ')'
        {{
        $$ = {
            type: 'group',
            role: 'Capturing',
            grouped: $2
        }
        }}
        /* TODO group num ++ */
    | '(' '?' ':' Disjunction ')'
        {{
        $$ = {
            type: 'group',
            role: 'Non Capturing',
            grouped: $4
        }
        }}
    ;

AtomEscape
    : DecimalDigits
        {$$ = {ESCAPED_INTEGER: true, decimals: $1}}
        /* delay parsing till all capturing groups have been found. TODO move quantifier */
    | CharacterEscape
        {{
        $1.label = 'Specific Char'
        $$ = $1
        }}
    | CharacterClassEscape
    ;
CharacterEscape
    /* {
        display: // required
    } */
    : ControlEscape
    | 'c' ControlLetter
        {$$ = {display: $1 + $2, hint: 'Control Character'}}
    | HexEscapeSequence
    | UnicodeEscapeSequence
    | IdentityEscape
        {$$ = {display: $1}}
    ;
ControlEscape
    : 'f'
        {$$ = {display: $1, hint: 'Form Feed'}}
    | 'n'
        {$$ = {display: $1, hint: 'Newline'}}
    | 'r'
        {$$ = {display: $1, hint: 'Carriage Return'}}
    | 't'
        {$$ = {display: $1, hint: 'Tab'}}
    | 'v'
        {$$ = {display: $1, hint: 'Vertical Tab'}}
    ;
HexEscapeSequence
    : 'u' HexDigit HexDigit HexDigit HexDigit
        {$$ = {display: '0x'+$2+$3+$4+$5, hint: 'Hexadecimal Notation'}}
    ;
UnicodeEscapeSequence
    : 'x' HexDigit HexDigit
        {$$ = {display: '0x'+$2+$3, hint: 'Hexadecimal Notation'}}
    ;

CharacterClassEscape
    : 'd'
        {$$ = {label: 'Digit Char', hint: '[0-9]'}}
    | 'D'
        {$$ = {label: 'Non Digit Char', hint: '[^0-9]'}}
    | 's'
        {$$ = {label: 'Whitespace Char', hint: 'TODO'}}
    | 'S'
        {$$ = {label: 'Non Whitespace Char', hint: 'TODO'}}
    | 'w'
        {$$ = {label: 'Word Char', hint: 'TODO'}}
    | 'W'
        {$$ = {label: 'Non Word Char', hint: 'TODO'}}
    ;

CharacterClass
    : '[' ClassRanges ']'
        /* TODO if first char is ^ then ... */
        {$$ = $2}
    ;
ClassRanges
    : /* empty */
    | NonemptyClassRanges
    ;
NonemptyClassRanges
    : ClassAtom
    | ClassAtom NonemptyClassRangesNoDash
    | ClassAtom '-' ClassAtom ClassRanges
    ;
NonemptyClassRangesNoDash
    : ClassAtom
    | ClassAtomNoDash NonemptyClassRangesNoDash
    | ClassAtomNoDash '-' ClassAtom ClassRanges
    ;
ClassAtom
    : '-'
    | ClassAtomNoDash
    ;
ClassAtomNoDash
    : ClassAtomNoDash_single
    | '\\' ClassEscape
        {$$ = $2}
    ;
ClassEscape
    : DecimalDigits
        {{
        debugger /* TODO closure needed? */
        (function(){
            // this particular literal is eval'd the same way as a string:
            // the first 0 to 3 chars could be octal.
            var converted = eval("'\\" + $1 + "'")
            var lenDiff = $$.length - converted.length
            var chars
            function specificChars(str) {
                str.split('').map(function(char){
                    return {type: 'specificChar(escaped)', val: char}
                })
            }
            if (lenDiff > 0) {
                chars = [{
                    type: 'charInOctal',
                    val: $1.slice(1, 1 + lenDiff),
                    convertedVal: converted[0]
                }]
                chars = chars.concat(specificChars(converted.slice(1)))
            } else {
                chars = specificChars(converted)
            }
            $$ = chars
        })()
        }}
    | 'b'
        {$$ = {type: 'backspace'}}
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


