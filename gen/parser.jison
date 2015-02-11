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

<<EOF>>                     debugger; return 'EOF'

<INITIAL>.                  this.begin('DISJ'); this.unput(yytext); return

<DISJ>.                     debugger; this.begin('ALT'); this.unput(yytext); return

[|]                         this.begin('ALT'); return 'ALT_DELIM'
<ALT>.                      this.begin('TERM'); this.unput(yytext); return

<TERM>[\^]                  return 'ASSERTN_LB_HEAD'
<TERM>[$]                   return 'ASSERTN_LB_FOOT'
<TERM>[\\][b]               return 'ASSERTN_WB_POS'
<TERM>[\\][B]               return 'ASSERTN_WB_NEG'
<TERM>[(][?][=]             debugger; this.begin('DISJ_IN_ASSERTN_FWD'); return 'ASSERTN_FWD_POS_BEGIN'
<TERM>[(][?][!]             this.begin('DISJ_IN_ASSERTN_FWD'); return 'ASSERTN_FWD_NEG_BEGIN'

<TERM>x return 'TERM_GENERIC'

<DISJ_IN_ASSERTN_FWD>[)]    debugger; this.popState(); return 'ASSERTN_FWD_END'
<DISJ_IN_ASSERTN_FWD>.      debugger; this.begin('ALT'); this.unput(yytext); return /* debugger; this.begin('DISJ'); this.unput(yytext); return */


%%

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
    ;
Alternative_s
    : Alternative
        {$$ = [$1]}
    | Alternative_s ALT_DELIM Alternative
        {$$ = $1.concat($2)}
    ;
Alternative
    : Term_s
    ;
Term_s
    : /* empty */
        {$$ = []}
    | Term_s Term
        {$$ = $1.concat($2)}
    ;
Term
    : Assertion
    | TERM_GENERIC
    ;
Assertion
    : ASSERTN_LB_HEAD
    | ASSERTN_LB_FOOT
    | ASSERTN_WB_POS
    | ASSERTN_WB_NEG
    | ASSERTN_FWD_POS_BEGIN Disjunction ASSERTN_FWD_END
        {$$ = {assertion: 'Look-Forward', pos: true, disj: $2}}
    | ASSERTN_FWD_NEG_BEGIN Disjunction ASSERTN_FWD_END
        {$$ = {assertion: 'Look-Forward', pos: false, disj: $2}}
    ;

%%

// some js here
