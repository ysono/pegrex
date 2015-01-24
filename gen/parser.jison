%lex

%%

"fac"                    return 'FACTOR'

"|"                         return '|'
"?"                         return '?'
"*"                         return '*'
"+"                         return '+'
"{"                         return '{'
"}"                         return '}'
","                         return ','

[0-9]                       return 'DIGIT'

/lex


%start choice

%%

choice
    : sequence_s
        {return {type: 'choice', val: $1}}
    ;
sequence_s
    : sequence_s '|' sequence
        {$$ = $1.concat($3)}
    | sequence
        {$$ = [$1]}
    ;

sequence
    : factor_quantifier_s
        {$$ = {type: 'sequence', val: $1}}
    ;
factor_quantifier_s
    : factor_quantifier_s factor_quantifier
        {$$ = $1.concat($2)}
    | factor_quantifier
        {$$ = [$1]}
    ;
factor_quantifier
    : factor quantifier
        {$1.quantifier = $2; $$ = $1}
    | factor
        {$$ = $1}
    ;

factor
    : FACTOR
        {$$ = {type: 'factor', val: $1}}
    ;


quantifier
    : quantifier_amount '?'
        {$$.type = 'quantifier'; $$.stragety = 'lazy'}
    | quantifier_amount
        {$$.type = 'quantifier'; $$.stragety = 'greedy'}
    ;
quantifier_amount
    : '?'
        {$$ = {min: 0, max: 1}}
    | '*'
        {$$ = {min: 0, max: Infinity}}
    | '+'
        {$$ = {min: 1, max: Infinity}}
    | '{' integer '}'
        {$$ = {min: Number($2), max: Number($2)}}
    | '{' integer ',' '}'
        {$$ = {min: Number($2), max: Infinity}}
    | '{' integer ',' integer '}'
        {$$ = {min: Number($2), max: Number($4)}}
    ;



integer
    : digits
        {$$ = Number($1)}
    ;
digits
    : digits DIGIT
        {$$ = $1 + $2}
    | DIGIT
    ;

