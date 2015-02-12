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
%s ESCAPED_IN_ATOM
%s CLASS
%s CLASS_ATOM
%s ESCAPED_IN_CLASS
%s ESCAPED_NONDECI

%%

<<EOF>>         return 'EOF'

<INITIAL>.      this.begin('DISJ'); this.unput(yytext); return

/* Disjunction */
<CLASS_ATOM>[)]             return 'CLASS_ATOM_ETC'
<ESCAPED_IN_ATOM>[)]        return 'ESC_ETC'
<ESCAPED_IN_CLASS>[)]       return 'ESC_ETC'
[)]                         %{
                                popTill(this, 'DISJ')
                                this.popState()
                                return 'CLOSE_PAREN'
                            %}
<DISJ>.         this.begin('ALT'); this.unput(yytext); return  

/* Alternative */
<CLASS_ATOM>[|]             return 'CLASS_ATOM_ETC'
<ESCAPED_IN_ATOM>[|]        return 'ESC_ETC'
<ESCAPED_IN_CLASS>[|]       return 'ESC_ETC'
[|]                         %{
                                popTill(this, 'ALT')
                                return 'ALT_DELIM'
                            %}
<ALT>.          this.begin('TERM'); this.unput(yytext); return

/* Quantifier */
<TERM>[*+?][?]?                         return 'ATOM_QUANT_SHORT'
<TERM>[{][0-9]+(?:[,][0-9]*)?[}][?]?    return 'ATOM_QUANT_NUM'

/* Assertion */
<TERM>[$^]                  return 'ASSERTN_LB'
<TERM>[\\][bB]              return 'ASSERTN_WB'
<TERM>[(][?][=!]            this.begin('DISJ'); return 'ASSERTN_LF_BEGIN'

/* Atom */
<TERM>[\.]                  return 'ATOM_CHAR_ANY'
<TERM>[\\]                  this.begin('ESCAPED_IN_ATOM'); return
<TERM>[\[][\^]?             this.begin('CLASS'); return 'CLASS_BEGIN'
<TERM>[(][^?]               this.begin('DISJ'); this.unput(yytext[1]); return 'ATOM_GROUP_CAPTR' /* note yytext[1] can be a `)` */
<TERM>[(][?][:]             this.begin('DISJ'); return 'ATOM_GROUP_NONCAPTR'

/* PatternCharacter */
/* contrary to ecma, allow `]` and `}` */
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
        {$$ = b().withLoc(@1).disjunction($1)}
    ;
Alternative_s
    : Alternative
        {$$ = [$1]}
    | Alternative_s ALT_DELIM Alternative
        {$$ = $1.concat($3)}
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
    | Atom Quantifier
        /* Add loc to $1 so b().quantified can use it. */
        {{ $$ = b().quantified(
            b().withLoc(@1).get($1),
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
        {$$ = b().charSet($2, $1.length === 1)}
    | ATOM_GROUP_CAPTR Disjunction CLOSE_PAREN
        {$$ = b().group(true, $2)}
    | ATOM_GROUP_NONCAPTR Disjunction CLOSE_PAREN
        {$$ = b().group(false, $2)}
    | ATOM_ETC
        {$$ = b().specificChar($1)}
    ;
AtomEscape
    : ATOM_ESCAPE_DECIMALS
        {$$ = b().decimalsEscMaybeRefPlaceholder(@1, $1)}
    | CharacterEscapeOrChracterClassEscape
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
    /* returned val can be array, due to decimalsEsc, or obj otherwise. */
    : CLASS_ATOM_ESCAPE_DECIMALS
        {$$ = b().decimalsEsc(@1, $1)}
    | CLASS_ATOM_ESCAPE_BS
        {$$ = b().specificCharEsc($1)}
    | CharacterEscapeOrChracterClassEscape
    ;

CharacterEscapeOrChracterClassEscape
    : ESC_DECI
        {$$ = b().specificCharEsc($1)}
    | ESC_CTRL
        {$$ = b().specificCharEsc($1)}
    | ESC_HEX4
        {$$ = b().specificCharEsc($1)}
    | ESC_HEX2
        {$$ = b().specificCharEsc($1)}
    | ESC_CLASS
        {$$ = b().charSetPreDefn($1)}
    | ESC_ETC
        {$$ = b().specificCharEsc($1)}
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

            // save so we can parse decimalsEscMaybeRefPlaceholder later
            savedTerms_s(terms)

            return result
        },

        quantifier: function(token) {
            // TODO validate min <= max
            if (token[0] !== '{') {
                return {
                    min: token[0] === '+' ? 1 : 0,
                    max: token[0] === '?' ? 1 : Infinity,
                    greedy: token.length < 2
                }
            }
            var matched = token.match(/{(\d+)(?:(,)(\d*))?}(\?)?/)
            return {
                min: Number(matched[1]),
                max: matched[3]
                    ? Number(matched[3])
                    : matched[2]
                        ? Infinity
                        : Number(matched[1]),
                greedy: ! matched[4]
            }
        },
        quantified: function(target, quantifier) {
            return {
                type: 'Quantified',
                target: target,
                quantifier: quantifier,
                textLoc: [target.textLoc[0], quantifier.textLoc[1]]
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
            numCapturedGroups(isCapturing)
            return {
                type: 'Group',
                isCapturing: isCapturing,
                grouped: disj
            }
        },

        charSetRange: function(from, to) {
            // TODO validate (range begin < range end)
            return {
                type: 'Range of Chars',
                range: [from, to],
                textLoc: from.textLoc && to.textLoc
                    ? [from.textLoc[0], to.textLoc[1]]
                    : undefined
            }
        },
        charSet: function(items, inclusive, predefined) {
            // TODO test: start with ^, ^-, -^, -
            
            var i, item, replacement
            for (i = 1; i < items.length - 1; i++) {
                item = items[1]
                if (item.type === 'Specific Char'
                        && item.display === '-') {
                    replacement = builders.charSetRange(
                        items[i - 1], items[i + 1])
                    items.splice(i - 1, 3, replacement)

                    // point i to the replacement item
                    i = i - 1
                }
            }

            return {
                type: 'Set of Chars',
                possibilities: items,
                inclusive: inclusive,
                predefined: predefined
            }
        },
        charSetPreDefn: function(key) {
            function makeRange(fromChar, toChar) {
                return builders.charSetRange(
                    builders.specificChar(fromChar),
                    builders.specificChar(toChar)
                )
            }
            var possibilities = {
                d: function() {
                    return [makeRange('0', '9')]
                },
                s: function() {
                    return [builders.specificCharEsc('n')] // TODO
                },
                w: function() {
                    return [
                        makeRange('0', '9'),
                        makeRange('A', 'Z'),
                        builders.specificChar('_'),
                        makeRange('a', 'z')
                    ]
                }
            }[key.toLowerCase()]()

            var meaning = {
                d: 'Decimal',
                D: 'Non-Decimal',
                s: 'Whitepace',
                S: 'Non-Whitespace',
                w: 'Word Char',
                W: 'Non-Word Char'
            }[key]

            return builders.charSet(
                possibilities,
                key >= 'a',
                {
                    display: '\\' + key,
                    meaning: meaning
                }
            )
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
        specificCharEsc: function(key) {
            var meaning = {
                b: 'Backspace',
                c: 'Control Char',
                f: 'Form Feed',
                n: 'New Line',
                r: 'Carriage Return',
                t: 'Horizontal Tab',
                v: 'Vertical Tab',
                x: 'Hexadecimal Notation',
                u: 'Hexadecimal Notation'
            }[key[0]]
            return {
                type: 'Specific Char',
                display: '\\' + key,
                meaning: meaning
            }
        },

        decimalsEscMaybeRefPlaceholder: function(loc, decimals) {
            return {
                type: 'decimalsEscMaybeRefPlaceholder',
                maxCapturedGroupNum: numCapturedGroups(),
                decimals: decimals,
                loc: loc
            }
        },
        decimalsEscMaybeRef: function(placeholder) {
            /* returns an array of specificChar or specificCharEsc
                or Reference or Quantified */
            /* TODO test 
                placeholder -> specificCharEsc and specificChar
                placeholder -> Reference
                Quantified -> [specific* , Quantified specific] // \1+, \8+, \18+, \88+
                Quantified -> [Quantified Reference]
            */
            function parse(p) {
                var intVal = Number(p.decimals)

                var isRef = p.decimals[0] > '0'
                    && intVal <= numCapturedGroups()
                if (! isRef) {
                    return builders.decimalsEsc(p.loc, p.decimals)
                }

                // Contrary to [ecma](http://www.ecma-international.org/ecma-262/5.1/#sec-15.10.2.9),
                // allow non-ref interpretation.

                var isBack = intVal <= p.maxCapturedGroupNum
                var hint = isBack
                    ? 'Warning: A Back Reference will match with an empty string if the target group has not been captured by the time this reference is expected. In practice, any group that is 1) outside the root-level Alternative that this Back Reference belongs to or 2) inside a Look-Forward Assertion will have not been captured.'
                    : 'Because its target group will never have been captured, a Forward Reference always matches with an empty string.'
                return [{
                    type: 'Reference',
                    number: intVal,
                    isBack: isBack,
                    hint: hint,
                    textLoc: [
                        p.loc.first_column - 1, // -1 for the `\`
                        p.loc.last_column
                    ]
                }]
            }
            if (placeholder.type !== 'Quantified') {
                return parse(placeholder)
            }
            var items = parse(placeholder.target)
            var quantified = builders.quantified(
                items.slice(-1)[0], placeholder.quantifier)
            items.splice(-1, 1, quantified)
            return items
        },
        decimalsEsc: function(loc, decimals) {
            // Contrary to [ecma](http://www.ecma-international.org/ecma-262/5.1/#sec-15.10.2.11),
            // support octal notations other than `\0`.

            var evalled = eval("'\\" + decimals + "'") // it's safe.
            var hasOctal = evalled[0] !== decimals[0]

            var loc0 = loc.first_column                

            var item0Len = hasOctal
                ? decimals.length - evalled.length + 1
                : 1
            var item0 = builders.specificCharEsc(
                    decimals.slice(0, item0Len) )
            item0.textLoc = [
                loc0 - 1, // -1 for the `\`
                loc0 + item0Len
            ]

            var item1Loc = item0.textLoc[1]
            var items = [item0]
                .concat(
                    evalled.slice(1).split('').map(function(c, i) {
                        var item = builders.specificChar(c)
                        item.textLoc = [
                            item1Loc + i,
                            item1Loc + i + 1
                        ]
                        return item
                    })
                )
            return items
        }
    }
    return builders
} // end of b()

// TODO can we parse placeholder in parser.yy provided by outside?

function savedTerms_s(terms) {
    var terms_s = parser.yy.terms_s = parser.yy.terms_s || []
    if (terms) {
        terms_s.push(terms)
    }
    return terms_s
}
function numCapturedGroups(set) {
    parser.yy.numCapturedGroups = parser.yy.numCapturedGroups || 0
    if (set) { parser.yy.numCapturedGroups++ }
    return parser.yy.numCapturedGroups
}

parser.parse = (function(orig) {
    function postParse() {
        var terms_s = savedTerms_s()
        terms_s.forEach(function(terms) {
            function splice() {
                var args = [i, 1].concat(replacement)
                Array.prototype.splice.apply(terms, args)
            }
            var i, term, replacement
            for (i = 0; i < terms.length; i++) {
                term = terms[i]

                var isPlaceholder =
                    term.type === 'decimalsEscMaybeRefPlaceholder'
                    || (term.type === 'Quantified'
                        && term.target.type === 'decimalsEscMaybeRefPlaceholder')
                if (isPlaceholder) {
                    replacement = b().decimalsEscMaybeRef(term)
                    splice()

                    // point i to the last elm of replacement
                    i = i + replacement.length - 1
                }
            }
        })

        // reset these values that make parser stateful
        terms_s.length = 0
        parser.yy.numCapturedGroups = 0
    }
    return function() {
        var parsed = orig.apply(this, arguments)
        postParse()
        return parsed
    }
})(parser.parse)
