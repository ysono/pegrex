/*
Rule names come from [ecma](http://www.ecma-international.org/ecma-262/5.1/#sec-15.10).

This spec supersedes ecma specification, in line with the behavior of major browsers.
For discrepancies noted below, a real-life example can be found in
`Parser::parseEscape` method from [Webkit](https://github.com/WebKit/webkit/blob/master/Source/JavaScriptCore/yarr/YarrParser.h)
*/

%lex

%x TERM
%x TERM_GROUP
%x TERM_GROUP_NONCAPTR
%x ESCAPED_IN_ATOM
%x CLASS
%x ESCAPED_IN_CLASS
%x ESCAPED_NONDECI

%%

<INITIAL>.                  this.begin('TERM'); this.unput(yytext); return
<TERM><<EOF>>               return 'EOF'

/* Disjunction */
<TERM>[)]                   popTillOutOf(this, 'TERM_GROUP'); return 'TERM_GROUP_END'

/* Alternative */
<TERM>[|]                   return 'ALT_DELIM'

/* Quantifier */
<TERM>[*+?][?]?                         return 'ATOM_QUANT_SHORT'
<TERM>[{][0-9]+(?:[,][0-9]*)?[}][?]?    return 'ATOM_QUANT_NUM'

/* Assertion and Atom */
<TERM>[(]                   this.begin('TERM_GROUP'); return 'TERM_GROUP_BEGIN'
<TERM_GROUP>[?]             this.begin('TERM_GROUP_NONCAPTR'); return
<TERM_GROUP>.               this.begin('TERM'); this.unput(yytext); return
<TERM_GROUP_NONCAPTR>[=!]   this.begin('TERM'); return 'ASSERTN_LOOKFWD_FLAG'
<TERM_GROUP_NONCAPTR>[:]    this.begin('TERM'); return 'ATOM_GROUP_NONCAPTR_BEGIN'

/* Assertion */
<TERM>[$^]                  return 'ASSERTN_LB'
<TERM>[\\][bB]              return 'ASSERTN_WB'

/* Atom */
<TERM>[\.]                  return 'ATOM_CHAR_ANY'
<TERM>[\\]                  this.begin('ESCAPED_IN_ATOM'); return 'ESCAPE_PREFIX'
<TERM>[\[][\^]?             this.begin('CLASS'); return 'CLASS_BEGIN'

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
<ESCAPED_NONDECI>[^cxu]                 this.popState(); return 'ESC_ETC' /* an approx. ecma's defn is much more involved. */

%%

function popTillOutOf(lexer, state) {
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
        {return yy.b.pattern($1)}
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
        {$$ = yy.b.assertionLB($1)}
    | ASSERTN_WB
        {$$ = yy.b.assertionWB($1)}
    | TERM_GROUP_BEGIN ASSERTN_LOOKFWD_FLAG Disjunction TERM_GROUP_END
        {$$ = yy.b.assertionLF($2, fixNestedDisjLoc($3,@2) )}
    ;

Atom
    : ATOM_CHAR_ANY
        {$$ = yy.b.anyChar()}
    | ESCAPE_PREFIX AtomEscape -> $2
    | CLASS_BEGIN ClassAtom_s CLASS_END
        {$$ = yy.b.charSet($1.length === 1, $2)}
    | TERM_GROUP_BEGIN Disjunction TERM_GROUP_END
        {$$ = yy.b.group(true, $2)}
    | TERM_GROUP_BEGIN ATOM_GROUP_NONCAPTR_BEGIN Disjunction TERM_GROUP_END
        {$$ = yy.b.group(false, $3)}
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
    : ESCAPE_PREFIX ClassEscape -> $2
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

%%

/*
    Bug with jison ???
    E.g. input 'a|x'
        loc of '|' is (1,2)
        loc of '|x' is (1,3) but ought to be (2,3)
        loc of 'x' is (2,3)
    E.g. '(?=x)'
        locs of both the nested disj and its nested alt are (2,4) but ought to be (3,4)
    Same issue with (?:x) and (x)
    If the token is modified to match '(?==x)', then the loc starts with the first '=', right after the '?'
    E.g. '(?=x|y)'
        loc of the nested disj and its first alt is wrong b/c they wrongly include '='
        loc of the second alt is wrong b/c alt wrongly includes '|'
    And it's _not_ b/c yy.b.withLoc is overriding correct loc.
    We don't have to stuff web doesn't make selectable. Normally disj and alt are both not selectable.
    Hack to fix disj under a look-fwd assertion only.
*/
function fixNestedDisjLoc(disj, precedingLoc) {
    disj.textLoc[0] = precedingLoc.last_column
    return disj
}
