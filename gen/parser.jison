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
        {{
        $$ = {alternatives: $1}
        if ($1.length > 1) {
            $$.hint = 'ECMA specifies right-recursive, but in practice, all major browsers appear to use all Alternatives concurrently for the earliest match in string.'
        }
        return $$
        }}
    ;
Disjunction /* 1 or more of groups of Term */
    : Alternative_formatted
        {$$ = [$1]}
    | Disjunction '|' Alternative_formatted
        {$$ = $1.concat($3)}
    ;
Alternative_formatted /* 0 or more of Term */
    : Alternative
        {{
        if (! $1.length) {
            $1.concat({
                type: 'zeroLenStr',
                hint: 'matches zero-length str. TODO must use /(?:)/ in the literal form.'
            })
        }
        $$ = {terms: $1}
        }}
    ;
Alternative /* 0 or more of Term */
    : /* empty */
        {$$ = []}
    | Alternative Term
        {$$ = $1.concat($2)}
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
            type: 'beginningOfLine',
            hint: 'Matches the zero-length string after a new line char, i.e. one of [newline (\\n), carriage return (\\r), line separator (\\u2028), paragraph separator (\\2029)]'
        }
        }}
    | '$'
        {{
        $$ = {
            type: 'endOfLine',
            hint: 'Matches the zero-length string before a new line char, i.e. one of [newline (\\n), carriage return (\\r), line separator (\\u2028), paragraph separator (\\2029)]'
        }
        }}
    | '\\' 'b'
        {{
        $$ = {
            type: 'wordBoundary',
            hint: 'Matches the zero-length string between (a word char (\\w)) and (a non-word char (\\W) or the beginning or end of a line")'
        }
        }}
    | '\\' 'B'
        {{
        $$ = {
            type: 'nonWordBoundary',
            hint: 'Matches the zero-length string between a word char (\\w) and a word char (\\w)'
        }
        }}
    | '(' '?' '=' Disjunction ')'
        {{
        $$ = {
            type: 'positiveLookforward',
            val: $4
        }
        }}
    | '(' '?' '!' Disjunction ')'
        {{
        $$ = {
            type: 'negativeLookforward',
            val: $4
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
    token value is an object like {
        type
        val (optional)
    }
    */
    : PatternCharacter
        {$$ = {type: 'specificChar', val: $1}}
    | '.'
        {$$ = {type: 'anyChar'}}
    | '\\' AtomEscape 
        {$$ = $2}
    | CharacterClass
    | '(' Disjunction ')'
        {{
        $$ = {
            type: 'capturingGroup',
            val: $2
        }
        }}
        /* TODO group num ++ */
    | '(' '?' ':' Disjunction ')'
        {$$ = {type: 'nonCapturingGroup', val: $4}}
    ;
AtomEscape
    : DecimalDigits
        {$$ = {type: 'escapedInteger', val: $1}}
        /* delay parsing till all capturing groups have been found. TODO move quantifier */
    | CharacterEscape
    | CharacterClassEscape
    ;
CharacterEscape
    : ControlEscape
    | 'c' ControlLetter
    | HexEscapeSequence
    | UnicodeEscapeSequence
    | IdentityEscape
    ;
ControlEscape
    : 'f'
    | 'n'
    | 'r'
    | 't'
    | 'v'
    ;
HexEscapeSequence
    : 'u' HexDigit HexDigit HexDigit HexDigit
    ;
UnicodeEscapeSequence
    : 'x' HexDigit HexDigit
    ;

CharacterClassEscape
    : 'd'
        {$$ = {type: 'digitChar', hint: '[0-9]'}}
    | 'D'
        {$$ = {type: 'nonDigitChar', hint: '[^0-9]'}}
    | 's'
        {$$ = {type: 'whitespaceChar', hint: 'TODO'}}
    | 'S'
        {$$ = {type: 'notWhitespaceChar', hint: 'TODO'}}
    | 'w'
        {$$ = {type: 'wordChar', hint: 'TODO'}}
    | 'W'
        {$$ = {type: 'nonWordChar', hint: 'TODO'}}
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


