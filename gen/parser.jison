%lex

%%

"escape" return 'ESCAPE'
"clazz" return 'CLAZZ'
"group" return 'GROUP'

"|"                         return '|'
"?"                         return '?'
"*"                         return '*'
"+"                         return '+'
"{"                         return '{'
"}"                         return '}'
","                         return ','
"/"                         return '/'
"\\"                        return '\\'
"["                         return '['
"]"                         return ']'
"("                         return '('
")"                         return ')'

[0-9]                       return 'CHAR_DIGIT'

[\u0000-\u001f\u007f\u0080-\u009f]      return 'CHAR_CTRL'

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
    : factor_char
        {$$ = {type: 'singleChar', val: $1}}
    | escape
        {$$ = {type: 'escapedChar', val: $1}}
    | clazz
        {$$ = {type: 'charSet', val: $1}}
    | group
        {$$ = {type: 'group', val: $1}}
    ;
factor_char
    : ','
    | CHAR_DIGIT
    | CHAR_OTHER
    ;

escape
    : ESCAPE
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
    : digits CHAR_DIGIT
        {$$ = $1 + $2}
    | CHAR_DIGIT
    ;

