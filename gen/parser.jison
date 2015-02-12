/*
Resrouces:
- [ECMA](http://www.ecma-international.org/ecma-262/5.1/#sec-15.10)
*/

%lex

%s DISJ
%s ALT
%s TERM
%s ESCAPED_IN_ATOM
%s CLASS
%s CLASS_ATOM
%s ESCAPED_IN_CLASS
%s ESCAPED_NONDECI

%%

<<EOF>>         return 'EOF'

<INITIAL>.      this.begin('DISJ'); this.unput(yytext); return

/* Disjunction */
[)]             %{
                    popTill(this, 'DISJ')
                    this.popState()
                    return 'CLOSE_PAREN'
                %}
<DISJ>.         this.begin('ALT'); this.unput(yytext); return  

/* Alternative */
[|]             %{
                    popTill('ALT')
                    return 'ALT_DELIM'
                %}
<ALT>.          this.begin('TERM'); this.unput(yytext); return

/* Quantifier */
<TERM>[*+?]                         return 'ATOM_QUANT_SHORT'
<TERM>[{][0-9]+(?:[,][0-9]*)?[}]    return 'ATOM_QUANT_NUM'

/* Assertion */
<TERM>[$^]                  return 'ASSERTN_LB'
<TERM>[\\][bB]              return 'ASSERTN_WB'
<TERM>[(][?][=!]            this.begin('DISJ'); return 'ASSERTN_LF_BEGIN'

/* Atom */
<TERM>[\.]                  return 'ATOM_CHAR_ANY'
<TERM>[\\]                  this.begin('ESCAPED_IN_ATOM'); return
<TERM>[\[]                  this.begin('CLASS'); return 'CLASS_BEGIN'
<TERM>[(][^?]               this.begin('DISJ'); this.unput(yytext[1]); return 'ATOM_GROUP_CAPTR' /* note yytext[1] can be a `)` */
<TERM>[(][?][:]             this.begin('DISJ'); return 'ATOM_GROUP_NONCAPTR'

/* PatternCharacter */
/* contrary to ecma, major browsers, as does this filtering scheme, allow `]` and `}` */
<TERM>.                     return 'ATOM_ETC'

/* AtomEscape */
<ESCAPED_IN_ATOM>[0-9]+     this.popState(); return 'ATOM_ESCAPE_DECIMALS' /* parse later in grammar */
<ESCAPED_IN_ATOM>.          this.popState(); this.begin('ESCAPED_NONDECI'); this.unput(yytext); return

/* CharacterClass */
<CLASS>[\]]                 this.popState(); return 'CLASS_END'
<CLASS>.                    this.begin('CLASS_ATOM'); this.unput(yytext); return

/* ClassAtom */
<CLASS_ATOM>[\\]            this.popState(); this.begin('ESCAPED_IN_CLASS'); return
<CLASS_ATOM>.               this.popState(); return 'CLASS_ATOM_ETC'
/* handle `^` and `-` later in grammar */

/* ClassEscape */
<ESCAPED_IN_CLASS>[0-9]+    this.popState(); return 'CLASS_ATOM_ESCAPE_DECIMALS' /* parse later in grammar */
<ESCAPED_IN_CLASS>[b]       this.popState(); return 'CLASS_ATOM_ESCAPE_BS'
<ESCAPED_IN_CLASS>.         his.popState(); this.begin('ESCAPED_NONDECI'); this.unput(yytext); return

/* CharacterEscape and ChracterClassEscape */
<ESCAPED_NONDECI>[c][0-9A-Z_a-z]        this.popState(); return 'ESC_DECI' /* contrary to ecma, major browsers allow `0-9_` */
<ESCAPED_NONDECI>[fnrtv]                this.popState(); return 'ESC_CTRL'
<ESCAPED_NONDECI>[x][0-9A-Fa-f]{4}      this.popState(); return 'ESC_HEX4'
<ESCAPED_NONDECI>[u][0-9A-Fa-f]{2}      this.popState(); return 'ESC_HEX2'
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
        {$$ = $1.concat(b().withLoc(@2).get($2) )}
        /* the withLoc here takes care of all kinds of terms. no need to add individually. */
    ;
Term
    : Assertion
    | Atom
        /* Atom can be array, due to decimalsEscapeMaybeRef and decimalsEscape, or obj otherwise. */
        /* Hence always convert to array. */
        /* Add loc so b().quantified can use it. */
        {$$ = [].concat( b().withLoc(@1).get($1) )}
    | Atom Quantifier
        {{ $$ = b().quantified( $1,
            b().withLoc(@2).quantifier($2) ) }}
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
    : ATOM_CHAR_ANY
        {$$ = b().anyChar()}
    | AtomEscape
    | CLASS_BEGIN ClassAtom_s CLASS_END
        {$$ = b().charSet($2)}
    | ATOM_GROUP_CAPTR Disjunction CLOSE_PAREN
        {$$ = b().group(true, $2)}
    | ATOM_GROUP_NONCAPTR Disjunction CLOSE_PAREN
        {$$ = b().group(false, $2)}
    | ATOM_ETC
        {$$ = b().specificChar($1)}
    ;
AtomEscape
    /* returned val can be array, due to decimalsEscapeMaybeRef, or obj otherwise. */
    : ATOM_ESCAPE_DECIMALS
        {$$ = b().decimalsEscapeMaybeRef(@1, $1)}
    | CharacterEscapeOrChracterClassEscape
        {$$ = b().specificCharEsc($1)}
    ;

ClassAtom_s
    : /* empty */
        {$$ = []}
    | ClassAtom_s ClassAtom
        /* add loc so b().charSet can use it */
        {$$ = $1.concat( b().withLoc(@2).get($2) )}
    ;
ClassAtom
    : ClassEscape
    | CLASS_ATOM_ETC
        {$$ = b().specificChar($1)}
    ;
ClassEscape
    /* returned val can be array, due to decimalsEscape, or obj otherwise. */
    : CLASS_ATOM_ESCAPE_DECIMALS
        {$$ = b().decimalsEscape(@1, $1)}
    | CLASS_ATOM_ESCAPE_BS
        {$$ = b().specificCharEsc($1, 'Backspace')}
    | CharacterEscapeOrChracterClassEscape
        {$$ = b().specificCharEsc($1)}
    ;

CharacterEscapeOrChracterClassEscape
    : ESC_DECI
    | ESC_CTRL
    | ESC_HEX4
    | ESC_HEX2
    | ESC_CLASS
    | ESC_ETC
    ;

%%

function b() {
    var builders = {
        withLoc: function(begin, end) {
            function assign(o) {
                if (o instanceof Array) {
                    // The concept of location is valid with one token only.
                    // Not an error if token can be an array or an obj
                    // namely AtomEscape and ClassEscape
                    return o
                }
                o.textLoc = [
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
            // TODO validate min <= max
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
        quantified: function(atoms, quantifier) {
            var target = atoms.slice(-1)[0]
            var quantified = {
                type: 'Quantified',
                target: target,
                quantifier: quantifier,
                textLoc: [target.textLoc[0], quantifier.textLoc[1]]
            }
            atoms.splice(-1, 1, quantified)
            return atoms
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
        },

        charSet: function(items) {
            // TODO test: start with ^, ^-, -^, -
            // TODO validate (range begin < range end)
            var inclusive = true
            if (items[0]
                    && items[0].type === 'Specific Char'
                    && items[0].display === '^') {
                inclusive = false
                items = items.slice(1)
            }

            var i, item
            for (i = 1; i < items.length - 1; i++) {
                item = items[1]
                if (item.type === 'Specific Char'
                        && item.display === '-') {
                    items.splice(i - 1, 3, {
                        type: 'Range of Chars',
                        range: [items[i - 1], items[i + 1]],
                        textLoc: [
                            items[i - 1].textLoc[0],
                            items[i + 1].textLoc[1]
                        ]
                    })

                    // we want to point i to the added 1 item
                    // which is now at (i - 1)
                    i = i - 1
                }
            }

            return {
                type: 'Set of Chars',
                items: items,
                inclusive: inclusive
            }
        },

        anyChar: function() {
            return {
                type: 'Any Char',
                display: '.'
            }
        },
        specificChar: function(display) {
            return {
                type: 'Specific Char',
                display: display
            }
        },
        specificCharEsc: function(key, meaning) {
            function keyToMeaning() {
                var map = {
                    c: 'Control Char',
                    f: 'Form Feed',
                    n: 'New Line',
                    r: 'Carriage Return',
                    t: 'Horizontal Tab',
                    v: 'Vertical Tab',
                    x: 'Hexadecimal Notation',
                    u: 'Hexadecimal Notation',
                    d: 'Decimal: [0-9]',
                    D: 'Non-Decimal: [^0-9]',
                    s: 'Whitepace',
                    S: 'Non-Whitespace',
                    w: 'Word Char: [0-9A-Z_a-z]',
                    W: 'Non-Word Char: [^0-9A-Z_a-z]'
                }
                return map[key[0]]
            }
            return {
                type: 'Specific Char',
                display: key,
                meaning: meaning || keyToMeaning()
            }
        },

        decimalsEscapeMaybeRef: function(loc, decimals) {
            // TODO ref
            return [{
                type: 'asdf',
                decimals: decimals,
                loc: loc
            }]
        },
        decimalsEscape: function(loc, decimals) {
            // TODO octal
            return [{
                type: 'asdf',
                decimals: decimals,
                loc: loc
            }]
        }
    }
    return builders
}
