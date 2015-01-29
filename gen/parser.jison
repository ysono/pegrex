/*
Resrouces:

- [ECMA](http://www.ecma-international.org/ecma-262/5.1/#sec-15.10)



http://www.ecma-international.org/ecma-262/5.1/#sec-15.10.2.9



the good parts doesn't have
    [^^]  -> means exclude tilda
    no \xhh or \uhhhh
MDN's page on RegExp
*/

%lex

%%

/* Terminals made of more than one char */

[0-9]{2,}                   return 'CHARS_DIGIT_DECIMAL'

/* Terminals made of an exact char */

[|] return '|'
[\^] return '^'
[$] return '$'
[\\] return '\\'
[b] return 'b'
[B] return 'B'
[(] return '('
[)] return ')'
[?] return '?'
[=] return '='
[!] return '!'
[*] return '*'
[+] return '+'
[{] return '{'
[}] return '}'
[,] return ','
[\.] return '.'

<<EOF>> return 'EOF'

/* Terminals made of exactly one char with multiple possibilities */

[0-9]                       return 'CHAR_DIGIT_DECIMAL'
.                           return 'CHAR_OTHER'

/lex

%start Pattern

%%

Pattern
    : Disjunction EOF
        {return {alternatives: $1}}
    ;
Disjunction /* 1 or more of groups of Term */
    : Alternative_formatted
        {$$ = [$1]}
    | Disjunction '|' Alternative_formatted
        {$$ = $1.concat($3)}
        /*
            TODO hint:
            ECMA specifies right-recursive, but in practice,
            all major browsers appear to use all Alternatives
            concurrently for the earliest match in string. 

            It doesn't matter for this parser anyway.
        */
    ;
Alternative_formatted /* 0 or more of Term */
    : Alternative
        {{
        if (! $1.length) {
            $1.concat({
                type: 'zeroLenStr',
                hint: 'matches zero-length str. must use /(?:)/ in the literal form.''
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
        /* $1 is always an array due to the empty condition above.
            $2 may be array.
         */
    ;
Term
    /*
    token value can be an object like below or an array of it
    {
        type
        hint (optional)
        val (optional)
        quantifier (optional)
    }
    */
    : Assertion
    | Atom
    | Atom Quantifier
        {{
        if ($1 instanceof Array) {
            // implicitly assert $1.length > 0
            $1.slice(-1)[0].quantifier = $2; $$ = $1
        } else {
            $1.quantifier = $2; $$ = $1
        }
        }}
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
    : PatternCharacter
        {$$ = {type: 'specificChar', val: $1}}
    | '.'
        {$$ = {type: 'anyChar'}}
    | '\\' AtomEscape
        {$$ = $2}
    /* | CharacterClass  TODO */
    | '(' Disjunction ')'
        {{
        $$ = {
            type: 'group',
            val: $2
        }
        }}
        /* TODO group num */
    | '(' '?' ':' Disjunction ')'
        {$$ = {type: 'nonCapturedGroup', val: $4}}
    ;
AtomEscape
    : DecimalDigits
        {$$ = {type: 'decimalEscape'}}
        /* delay parsing till all capturing groups have been matched */
    | CharacterEscape
    | CharacterClassEscape
        {$$ = {type: 'characterClassEscape'}}
    ;
CharacterEscape
    : '\\' 'f' /* TODO */
        {$$ = {type: 'formFeed'}}
    ;

integer
    : DecimalDigits
        {$$ = Number($1)}
    ;

/* Rules that are sets of terminals */
DecimalDigits
    : CHARS_DIGIT_DECIMAL
    | CHAR_DIGIT_DECIMAL
    ;
PatternCharacter
    : 'b'
    | 'B'
    | '='
    | '!'
    | ','
    | CHAR_DIGIT_DECIMAL
    | CHAR_OTHER
    ;
CharacterClassEscape
    : 'd'
    | 'D'
    | 's'
    | 'S'
    | 'w'
    | 'W'
    ;




%%

/*
ctrl chars are no longer ignored as of ecma 5
*/
