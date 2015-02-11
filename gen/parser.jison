/*
Resrouces:
- [ECMA](http://www.ecma-international.org/ecma-262/5.1/#sec-15.10)
*/

%lex

%s DISJ
%s ALT
%s TERM
%s DISJ_IN_ASSERTN_FWD




%%

<<EOF>>         return 'EOF'

<INITIAL>.      this.begin('DISJ'); this.unput(yytext); return

/* disjunction */
[)]             %{
                    popTill(this, 'DISJ')
                    this.popState()
                    return 'CLOSE_PAREN'
                %}
<DISJ>.         this.begin('ALT'); this.unput(yytext); return  

/* alternative */
[|]             %{
                    popTill('ALT')
                    return 'ALT_DELIM'
                %}
<ALT>.          this.begin('TERM'); this.unput(yytext); return

/* assertion */
<TERM>[$^]                  return 'ASSERTN_LB'
<TERM>[\\][bB]              return 'ASSERTN_WB'
<TERM>[(][?][=!]            debugger; this.begin('DISJ'); return 'ASSERTN_LF_BEGIN'

/* atom */
<TERM>[\.]                  return 'ATOM_CHAR_ANY'
<TERM>[\\][f]               return 'ATOM_ATOMESC' /* TODO not just f */
/* todo char class */
<TERM>[(][^?]               debugger; this.begin('DISJ'); this.unput(yytext[1]); return 'ATOM_GROUP_CAPTR' /* note yytext[1] can be a ) */
<TERM>[(][?][:]             debugger; this.begin('DISJ'); return 'ATOM_GROUP_NONCAPTR'
/* todo patterncharacter */

/* quantifier */
<TERM>[*+?]                         return 'ATOM_QUANT_SHORT'
<TERM>[{][0-9]+(?:[,][0-9]*)?[}]    return 'ATOM_QUANT_NUM'



%%

function popTill(lexer, state) {
    debugger
    var st
    do {
        st = lexer.popState()
    } while (st !== state)
}

function foo() {
    var l = lexer
    debugger
}

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
    | Alternative_s ALT_DELIM Alternative
        {$$ = $1.concat($2)}
    ;
Alternative
    : Term_s
        {$$ = b().withLoc(@1).alternative($1)}
    ;
Term_s
    : /* empty */
        {$$ = []}
    | Term_s Term
        {$$ = $1.concat($2)} /* TODO loc for all kinds of term here */
    ;
Term
    : Assertion
    | Atom
    | Atom Quantifier
        {$$ = b().quantified( $1, 
            b().withLoc(@2).quantifier($2) )}
    ;
Quantifier
    : ATOM_QUANT_SHORT
    | ATOM_QUANT_NUM
    ;
Assertion
    : ASSERTN_LB
        {$$ = b().withLoc(@1).assertionLB($1)}
    | ASSERTN_WB
        {$$ = b().withLoc(@1).assertionWB($1)}
    | ASSERTN_LF_BEGIN Disjunction CLOSE_PAREN
        {$$ = b().withLoc(@1,@3).assertionLF($1, $2)}
    ;
Atom
    : ATOM_CHAR_ANY /* TODO */
    | ATOM_ATOMESC /* TODO from token */
    | ATOM_GROUP_CAPTR Disjunction CLOSE_PAREN
        {$$ = b().group(true, $2)}
    | ATOM_GROUP_NONCAPTR Disjunction CLOSE_PAREN
        {$$ = b().group(false, $2)}
    ;

%%

// some js here

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
                    var token = builders[key].apply(builders, arguments)
                    return assign(token)
                }
                return map
            }, {})
            augmented.get = assign
            return augmented
        },
        disjunction: function(alts) {
            return {
                type: 'Disjunction',
                alternatives: alts
            }
        },
        alternative: function(terms) {
            var result = {
                type: 'Alternative',
                terms: terms
            }
            if (! terms.length) {
                result.hint = 'Matches zero-length string.'
            }
            return result
        },

        quantifier: function(token) {
            if (token.length === 1) {
                return {
                    type: 'Quantifier',
                    min: token === '+' ? 1 : 0,
                    max: token === '?' ? 1 : Infinity
                }
            }
            var matched = token.match(/{(\d+)(?:(,)(\d*))?}/)
            return {
                type: 'Quantifier',
                min: Number(matched[1]),
                max: matched[3]
                    ? Number(matched[3])
                    : matched[2]
                        ? Infinity
                        : Number(matched[1])
            }
        },
        quantified: function(atom, quantifier) {
            return {
                type: 'Quantified',
                target: atom,
                quantifier: quantifier
            }
        },

        assertionLB: function(token) {
            var atBeg = token === '^'
            var hint = (function() {
                var prepo = atBeg ? 'after' : 'before'
                var char0 = atBeg ? 'beginning of string' : 'end of string'
                var charlist = [char0].concat([
                    'newline (\\n)',
                    'carriage return (\\r)',
                    'line separator',
                    'paragraph separator'
                ])
                return [
                    'Matches the zero-length string ',
                    prepo,
                    ' a new line char, i.e. one of [',
                    String(charlist),
                    ']'
                ].join('')
            })()
            return {
                type: 'Assertion',
                assertion: 'Line Boundary',
                atBeginning: atBeg,
                hint: hint
            }
        },
        assertionWB: function(token) {
            var atWb = token[1] === 'b'
            var hint = atWb
                ? '(a word char (\\w)) and (a non-word char (\\W) or the beginning or the end of a line")'
                : 'a word char (\\w) and a word char (\\w)'
            hint = 'Matches the zero-length string between ' + hint
            return {
                type: 'Assertion',
                assertion: 'Word Boundary',
                atBoundary: atWb,
                hint: hint
            }
        },
        assertionLF: function(token, disj) {
            return {
                type: 'Assertion',
                assertion: 'Look-Forward',
                isPositive: token[2] === '=',
                grouped: disj
            }
        },

        group: function(isCapturing, disj) {
            return {
                type: 'Group',
                isCapturing: isCapturing,
                grouped: disj
            }
        }
    }
    return builders
}
