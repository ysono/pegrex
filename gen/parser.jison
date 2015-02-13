/*
Rule names come from [ecma](http://www.ecma-international.org/ecma-262/5.1/#sec-15.10).

This spec supersedes ecma specification, in line with the behavior of major browsers.
For discrepancies noted below, a real-life example can be found in
`Parser::parseEscape` method from [Webkit](https://github.com/WebKit/webkit/blob/master/Source/JavaScriptCore/yarr/YarrParser.h)
*/

%lex

%s DISJ
%s ALT
%s TERM
%s TERM_GROUP
%s ESCAPED_IN_ATOM
%s CLASS
%s ESCAPED_IN_CLASS
%s ESCAPED_NONDECI

%%

<<EOF>>         return 'EOF'

<INITIAL>.      this.begin('DISJ'); this.unput(yytext); return

/* Disjunction */
<CLASS>[)]                  return 'CLASS_ATOM_ETC'
<ESCAPED_IN_ATOM>[)]        this.popState(); return 'ESC_ETC'
<ESCAPED_IN_CLASS>[)]       this.popState(); return 'ESC_ETC'
[)]                         %{
                                popTill(this, 'DISJ')
                                this.popState()
                                return 'CLOSE_PAREN'
                            %}
<DISJ>.                     this.begin('ALT'); this.unput(yytext); return  

/* Alternative */
<CLASS>[|]                  return 'CLASS_ATOM_ETC'
<ESCAPED_IN_ATOM>[|]        this.popState(); return 'ESC_ETC'
<ESCAPED_IN_CLASS>[|]       this.popState(); return 'ESC_ETC'
[|]                         %{
                                popTill(this, 'ALT')
                                return 'ALT_DELIM'
                            %}
<ALT>.                      this.begin('TERM'); this.unput(yytext); return

/* Quantifier */
<TERM>[*+?][?]?                         return 'ATOM_QUANT_SHORT'
<TERM>[{][0-9]+(?:[,][0-9]*)?[}][?]?    return 'ATOM_QUANT_NUM'

/* Assertion and Atom */
<TERM>[(][?]                this.begin('TERM_GROUP'); return

/* Assertion */
<TERM>[$^]                  return 'ASSERTN_LB'
<TERM>[\\][bB]              return 'ASSERTN_WB'
<TERM_GROUP>[=!]            this.popState(); this.begin('DISJ'); return 'ASSERTN_LF_BEGIN'

/* Atom */
<TERM>[\.]                  return 'ATOM_CHAR_ANY'
<TERM>[\\]                  this.begin('ESCAPED_IN_ATOM'); return 'ESCAPE_PREFIX'
<TERM>[\[][\^]?             this.begin('CLASS'); return 'CLASS_BEGIN'
<TERM>[(]                   this.begin('DISJ'); return 'ATOM_GROUP_CAPTR' /* note yytext[1] can be a `)` */
<TERM_GROUP>[:]             this.popState(); this.begin('DISJ'); return 'ATOM_GROUP_NONCAPTR'

/* PatternCharacter */
/* ecma forbids ^ $ \ . * + ? ( ) [ ] { } | */
/* but allow `]` and `}`. no additional filtering necessary thanks for other higher priority rules for state <TERM>. */
<TERM>.                     return 'ATOM_ETC'

/* AtomEscape */
<ESCAPED_IN_ATOM>[0-9]+     this.popState(); return 'ATOM_ESCAPE_DECIMALS' /* parse later in grammar */
<ESCAPED_IN_ATOM>.          this.popState(); this.begin('ESCAPED_NONDECI'); this.unput(yytext); return

/* CharacterClass */
<CLASS>[\]]                 this.popState(); return 'CLASS_END'
<CLASS>[\\]                 this.begin('ESCAPED_IN_CLASS'); return 'ESCAPE_PREFIX'
<CLASS>.                    return 'CLASS_ATOM_ETC'
/* handle `^` and `-` later in grammar */

/* ClassEscape */
<ESCAPED_IN_CLASS>[0-9]+    this.popState(); return 'CLASS_ATOM_ESCAPE_DECIMALS' /* parse later in grammar */
<ESCAPED_IN_CLASS>[b]       this.popState(); return 'CLASS_ATOM_ESCAPE_BS'
<ESCAPED_IN_CLASS>.         this.popState(); this.begin('ESCAPED_NONDECI'); this.unput(yytext); return

/* CharacterEscape and CharacterClassEscape */
<ESCAPED_NONDECI>[c][0-9A-Z_a-z]        this.popState(); return 'ESC_DECI' /* contrary to ecma, allow `[0-9_]` */
<ESCAPED_NONDECI>[fnrtv]                this.popState(); return 'ESC_CTRL'
<ESCAPED_NONDECI>[x][0-9A-Fa-f]{2}      this.popState(); return 'ESC_HEX2'
<ESCAPED_NONDECI>[u][0-9A-Fa-f]{4}      this.popState(); return 'ESC_HEX4'
<ESCAPED_NONDECI>[dDsSwW]               this.popState(); return 'ESC_CLASS'
<ESCAPED_NONDECI>.                      this.popState(); return 'ESC_ETC' /* an approx. ecma's defn is much more involved. */

%%

function popTill(lexer, state) {
    var st
    do {
        st = lexer.popState()
    } while (st !== state)
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
        {$$ = yy.b.withLoc(@1).disjunction($1)}
    ;
Alternative_s
    : Alternative
        {$$ = [$1]}
    | Alternative_s ALT_DELIM Alternative
        {$$ = $1.concat($3)}
    ;
Alternative
    : Term_s
        {$$ = yy.b.withLoc(@1).alternative($1)}
    ;
Term_s
    : /* empty */
        {$$ = []}
    | Term_s Term
        {$$ = $1.concat(yy.b.withLoc(@2).get($2) )}
        /* the withLoc here takes care of all kinds of terms. no need to add individually. */
    ;
Term
    : Assertion
    | Atom
    | Atom Quantifier
        /* Add loc to $1 so yy.b.quantified can use it. */
        {{ $$ = yy.b.quantified(
            yy.b.withLoc(@1).get($1),
            yy.b.withLoc(@2).quantifier($2) ) }}
    ;
Quantifier
    : ATOM_QUANT_SHORT
    | ATOM_QUANT_NUM
    ;
Assertion
    : ASSERTN_LB
        {$$ = yy.b.withLoc(@1).assertionLB($1)}
    | ASSERTN_WB
        {$$ = yy.b.withLoc(@1).assertionWB($1)}
    | ASSERTN_LF_BEGIN Disjunction CLOSE_PAREN
        {$$ = yy.b.withLoc(@1,@3).assertionLF($1, $2)}
    ;

Atom
    : ATOM_CHAR_ANY
        {$$ = yy.b.anyChar()}
    | ESCAPE_PREFIX AtomEscape
        {$$ = yy.b.withLoc(@1,@2).get($2)}
    | CLASS_BEGIN ClassAtom_s CLASS_END
        {$$ = yy.b.charSet($2, $1.length === 1)}
    | ATOM_GROUP_CAPTR Disjunction CLOSE_PAREN
        {$$ = yy.b.group(true, $2)}
    | ATOM_GROUP_NONCAPTR Disjunction CLOSE_PAREN
        {$$ = yy.b.group(false, $2)}
    | ATOM_ETC
        {$$ = yy.b.specificChar($1)}
    ;
AtomEscape
    : ATOM_ESCAPE_DECIMALS
        {$$ = yy.b.decimalsEscMaybeRefPlaceholder(@1, $1)}
    | CharacterEscapeOrChracterClassEscape
    ;

ClassAtom_s
    : /* empty */
        {$$ = []}
    | ClassAtom_s ClassAtom
        /* add loc so yy.b.charSet can use it */
        {$$ = $1.concat( yy.b.withLoc(@2).get($2) )}
    ;
ClassAtom
    : ESCAPE_PREFIX ClassEscape
        {$$ = yy.b.withLoc(@1,@2).get($2)}
    | CLASS_ATOM_ETC
        {$$ = yy.b.specificChar($1)}
    ;
ClassEscape
    /* returned val can be array, due to decimalsEsc, or obj otherwise. */
    : CLASS_ATOM_ESCAPE_DECIMALS
        {$$ = yy.b.decimalsEsc(@1, $1)}
    | CLASS_ATOM_ESCAPE_BS
        {$$ = yy.b.specificCharEsc($1)}
    | CharacterEscapeOrChracterClassEscape
    ;

CharacterEscapeOrChracterClassEscape
    : ESC_DECI
        {$$ = yy.b.specificCharEsc($1)}
    | ESC_CTRL
        {$$ = yy.b.specificCharEsc($1)}
    | ESC_HEX4
        {$$ = yy.b.specificCharEsc($1)}
    | ESC_HEX2
        {$$ = yy.b.specificCharEsc($1)}
    | ESC_CLASS
        {$$ = yy.b.charSetPreDefn($1)}
    | ESC_ETC
        {$$ = yy.b.specificCharEsc($1)}
    ;
