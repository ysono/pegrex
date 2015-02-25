;(function() {
    'use strict'

    var terms_s = []
    var numCapturedGroups = 0

    var builders = {
        withLoc: function(loc, arg, builderName) {
            var token = builderName
                ? builders[builderName](arg)
                : arg
            if (token instanceof Array) {
                // The concept of location is valid with one token only.
                // Not an error if token can be an array or an obj
                // namely ClassEscape
                return token
            }
            token.textLoc = [
                loc.first_column,
                loc.last_column
            ]
            return token
        },

        pattern: function(disj) {
            function terminus() {
                return {
                    type: 'Terminus'
                }
            }
            return {
                type: 'Pattern',
                roots: [
                    terminus(),
                    disj,
                    terminus()
                ]
            }
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
            terms_s.push(terms)

            return result
        },

        quantifier: function(token) {
            if (token[0] !== '{') {
                return {
                    type: 'Quantifier',
                    min: token[0] === '+' ? 1 : 0,
                    max: token[0] === '?' ? 1 : Infinity,
                    greedy: token.length < 2
                }
            }
            var matched = token.match(/{(\d+)(?:(,)(\d*))?}(\?)?/)
            var result = {
                type: 'Quantifier',
                min: Number(matched[1]),
                max: matched[3]
                    ? Number(matched[3])
                    : matched[2]
                        ? Infinity
                        : Number(matched[1]),
                greedy: ! matched[4]
            }
            if (result.min > result.max) {
                throw new Error(
                    'Min must be <= to max. Invalid pair: '
                    + [result.min, result.max])
            }
            return result
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
            var sepChars = [
                'New Line (\\n)',
                'Carriage Return (\\r)',
                'Line Separator (\\u2028)',
                'Paragraph Separator (\\u2029)'
            ]
            var hint = [
                'Asserts that immediately',
                atBeg ? 'left' : 'right',
                'of this position is a "line separation".',
                'Matches the zero-length string between the "line separation" and the char',
                atBeg ? 'after' : 'before',
                'it.',
                'In the regular single-line mode, a "line separation" is the beginning or the end of the input.',
                'In multi-line mode, a "line separation" also includes these chars:',
                sepChars,
            ].join(' ') + '.'
            return {
                type: 'Assertion',
                assertion: (atBeg ? 'Start' : 'End') + ' of Line',
                atBeg: atBeg,
                hint: hint
            }
        },
        assertionWB: function(token) {
            var atWb = token[1] === 'b'
            var wc = '(a word char (\\w))'
            var nwc = '(a non-word char (\\W) or the start (^) or the end ($) of a line)'
            var hint = [
                'Matches the zero-length string between',
                wc,
                'and',
                atWb ? nwc : wc
            ].join(' ') + '.'
            return {
                type: 'Assertion',
                assertion: (atWb ? '' : 'Non-') + 'Word Boundary',
                atWb: atWb,
                hint: hint
            }
        },
        assertionLF: function(flag, disj) {
            return {
                type: 'Grouped Assertion',
                assertion: (flag === '=' ? 'Positive' : 'Negative')
                    + ' Look-Forward',
                grouped: disj
            }
        },

        group: function(isCapturing, disj) {
            return {
                type: 'Group',
                number: isCapturing ? ++numCapturedGroups : undefined,
                grouped: disj
            }
        },

        charSetAnyOtherChar: function() {
            return {
                type: 'Any Other Char'
            }
        },
        charSetRange: function(from, to) {
            if (from.display > to.display) {
                throw new Error(
                    'The beginning char must be <= to the ending char.'
                    + ' Invalid pair: ' + [from.display, to.display])
            }
            return {
                type: 'Range of Chars',
                range: [from, to],
                textLoc: from.textLoc && to.textLoc
                    ? [from.textLoc[0], to.textLoc[1]]
                    : undefined
            }
        },
        charSet: function(loc, inclusive, items, predefined) {
            // TODO test: start with ^, ^-, -^, -, [\d-x]
            
            // convert some of 'Specific Char's to 'Range of Chars'.
            // more readable to do it here than in lex.
            var i, item, prevItem, nextItem, replacement
            for (i = 1; i < items.length - 1; i++) {
                item = items[i]
                prevItem = items[i - 1]
                nextItem = items[i + 1]
                if (item.type === 'Specific Char' && item.display === '-'
                    && prevItem.type === 'Specific Char'
                    && nextItem && nextItem.type === 'Specific Char') {

                    replacement = builders.charSetRange(prevItem, nextItem)
                    items.splice(i - 1, 3, replacement)

                    // On the next loop, want i to point to 2 elms ahead of replacement.
                    // replacement is now at (i - 1) -> 2 ahead is (i + 1)
                    // compensate for i++ by subtr 1 -> don't move i
                }
            }

            var toggleInclusive = {
                'Any Other Char': function() {
                    // do nothing since we're not visually distinguishing in/excl.
                },
                'Specific Char': function(parentIncl, sc) {
                    sc.inclusive = parentIncl
                },
                'Range of Chars': function(parentIncl, r) {
                    r.inclusive = parentIncl
                    r.range.forEach(function(sc) {
                        toggleInclusive[sc.type](parentIncl, sc)
                    })
                },
                'Set of Chars': function(parentIncl, s) {
                    var myIncl = parentIncl === s.inclusive
                    s.inclusive = myIncl
                    s.possibilities.forEach(function(p) {
                        toggleInclusive[p.type](myIncl, p)
                    })
                }
            }
            items.forEach(function(item) {
                toggleInclusive[item.type](inclusive, item)
            })

            var result = {
                type: 'Set of Chars',
                inclusive: inclusive,
                possibilities: items,
                predefined: predefined
            }
            if (! inclusive) {
                if (loc) {
                    builders.withLoc(loc, result)
                }
                result = {
                    type: 'Set of Chars',
                    inclusive: true,
                    possibilities: [
                        result,
                        builders.charSetAnyOtherChar()
                    ]
                }
            }
            return result
        },
        charSetPreDefn: function(key) {
            var inclusive = key >= 'a'

            function makeRange(fromChar, toChar) {
                var range = builders.charSetRange(
                    builders.specificChar(fromChar),
                    builders.specificChar(toChar)
                )
                return range
            }
            var possibilities = {
                d: function() {
                    return [makeRange('0', '9')]
                },
                s: function() {
                    return [
                        builders.specificCharEsc('n'),
                        builders.specificCharEsc('r'),
                        builders.specificCharEsc('u2028'),
                        builders.specificCharEsc('u2029'),
                        builders.specificCharEsc('t'),
                        builders.specificCharEsc('v'),
                        builders.specificCharEsc('f'),
                        builders.specificChar(' '),
                        builders.specificCharEsc('u00a0')
                    ]
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
                null, // if pre defn is exclusive, its nested Set of Chars
                    // won't be selectable, and that's ok
                inclusive,
                possibilities,
                {
                    display: '\\' + key,
                    meaning: meaning
                }
            )
        },

        anyChar: function() {
            return {
                type: 'Any Char'
            }
        },
        specificChar: function(display) {
            display = {
                ' ': 'Space Char'
            }[display] || display
            return {
                type: 'Specific Char',
                display: display
            }
        },
        specificCharEsc: function(key, meaning) {
            var map = {
                b: 'Backspace',
                c: 'Control Char',
                f: 'Form Feed',
                n: 'New Line',
                r: 'Carriage Return',
                t: 'Horizontal Tab',
                v: 'Vertical Tab',
                x: 'Hexadecimal Notation',
                u: 'Hexadecimal Notation',
                'u2028': 'Line Separator',
                'u2029': 'Paragraph Separator',
                'u00a0': 'Nbsp'
            }
            meaning = meaning || map[key] || map[key[0]]
            return {
                type: 'Specific Char',
                display: (meaning ? '\\' : '') + key,
                meaning: meaning
            }
        },

        decimalsEscMaybeRefPlaceholder: function(loc, decimals) {
            return {
                type: 'decimalsEscMaybeRefPlaceholder',
                maxCapturedGroupNum: numCapturedGroups,
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
                    && intVal <= numCapturedGroups
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

            var evalled = window.eval("'\\" + decimals + "'") // it's safe.
            var hasOctal = evalled[0] !== decimals[0]

            var loc0 = loc.first_column                

            var item0Len = hasOctal
                ? decimals.length - evalled.length + 1
                : 1
            var item0 = builders.specificCharEsc(
                    decimals.slice(0, item0Len),
                    hasOctal ? 'Octal Notation' : null)
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
    } // end of var builders
    parser.yy.b = builders

    // note: we could assign yy.parseError to customize error to include text location,
    //     but location isn't helpful.

    parser.parse = (function(orig) {
        function postParse() {
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
                        replacement = builders.decimalsEscMaybeRef(term)
                        splice()

                        // point i to the last elm of replacement
                        i = i + replacement.length - 1
                    }
                }
            })
        }
        return function() {
            try {
                var parsed = orig.apply(this, arguments)
                postParse()
                return parsed
            } finally {
                // reset these values that make parser stateful
                terms_s.length = 0
                numCapturedGroups = 0
            }
        }
    })(parser.parse)

})()
