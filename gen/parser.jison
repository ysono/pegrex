%lex

%%

"clazz" return 'CLAZZ'
"group" return 'GROUP'

[|]                         return '|'
[?]                         return '?'
[*]                         return '*'
[+]                         return '+'
[{]                         return '{'
[}]                         return '}'
[,]                         return ','
[/]                         return '/'
[\\]                        return '\\'
[[]                         return '['
[]]                         return ']'
[(]                         return '('
[)]                         return ')'

[b]                         return 'b'
[d]                         return 'd'
[f]                         return 'f'
[n]                         return 'n'
[r]                         return 'r'
[s]                         return 's'
[t]                         return 't'
[u]                         return 'u'
[w]                         return 'w'
[B]                         return 'B'
[D]                         return 'D'
[S]                         return 'S'
[W]                         return 'W'

[\u0000-\u001f\u007f\u0080-\u009f]      return 'CHAR_CTRL'
[0-9]                       return 'CHAR_DIGIT'
[a-fA-F]                    return 'CHAR_ALPHABET_HEX'

.                           return 'CHAR_OTHER'

/lex


%start choice

%%

choice
    : sequence_s
        {return {sequences: $1}}
    ;
sequence_s
    : sequence_s '|' sequence
        {$$ = $1.concat($3)}
    | sequence
        {$$ = [$1]}
    ;

sequence
    : quantifiedFactor_s
        {$$ = {quantifiedFactors: $1}}
    ;
quantifiedFactor_s
    : quantifiedFactor_s quantifiedFactor
        {$$ = $1.concat($2)}
    | quantifiedFactor
        {$$ = [$1]}
    ;
quantifiedFactor
    : factor quantifier
        {$1.quantifier = $2; $$ = $1}
    | factor
        {$1.quantifier = {min: 1, max: 1, isGreedy: true}; $$ = $1}
    ;

factor
    : chargroup_factorSingle
        {$$ = {type: 'singleChar', val: $1}}
    | escape
        {$$ = {type: 'escapedChar', val: $1}}
    | clazz
        {$$ = {type: 'charSet', val: $1}}
    | group
        {$$ = {type: 'group', val: $1}}
    ;

escape
    : '\\' escape_unescaped
        {$$ = $2}
    ;
escape_unescaped
    : 'f'
        {$$ = {type: 'formfeed'}}
    | 'n'
        {$$ = {type: 'newline'}}
    | 'r'
        {$$ = {type: 'carriageReturn'}}
    | 't'
        {$$ = {type: 'tab'}}
    | 'u' chargroup_hex chargroup_hex chargroup_hex chargroup_hex
        {$$ = {type: 'unicode', val: $2+$3+$4+$5}}
    | 'B'
    | 'D'
    | 'S'
    | 'W'
    | 'b'
    | 'd'
    | 's'
    | 'w'
    ;

clazz
    : CLAZZ
    ;

group
    : GROUP
    ;

quantifier
    : quantifierAmount '?'
        {$1.isGreedy = false; $$ = $1}
    | quantifierAmount
        {$1.isGreedy = true; $$ = $1}
    ;
quantifierAmount
    : '?'
        {$$ = {min: 0, max: 1}}
    | '*'
        {$$ = {min: 0, max: Infinity}}
    | '+'
        {$$ = {min: 1, max: Infinity}}
    | '{' integer '}'
        {$$ = {min: $2, max: $2}}
    | '{' integer ',' '}'
        {$$ = {min: $2, max: Infinity}}
    | '{' integer ',' integer '}'
        {$$ = {min: $2, max: $4}}
    ;



integer
    : digits
        {$$ = Number($1)}
    ;
digits
    : digits chargroup_digit
        {$$ = $1 + $2}
    | chargroup_digit
    ;



chargroup_digit
    : CHAR_DIGIT
    ;
chargroup_factorSingle
    : ','
    | 'b'
    | 'd'
    | 'f'
    | 'n'
    | 'r'
    | 's'
    | 't'
    | 'u'
    | 'w'
    | 'B'
    | 'D'
    | 'S'
    | 'W'
    | CHAR_DIGIT
    | CHAR_ALPHABET_HEX
    | CHAR_OTHER
    ;
chargroup_hex
    : 'b'
    | 'd'
    | 'f'
    | 'B'
    | 'D'
    | CHAR_DIGIT
    | CHAR_ALPHABET_HEX
    ;
