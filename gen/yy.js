;(function() {
    var terms_s = []
    var numCapturedGroups = 0

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
            terms_s.push(terms)

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
        assertionLF: function(flag, disj) {
            return {
                type: 'Assertion',
                assertion: 'Look-Forward',
                isPositive: flag === '=',
                grouped: disj
            }
        },

        group: function(isCapturing, disj) {
            if (isCapturing) { numCapturedGroups++ }
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
                item = items[i]
                if (item.type === 'Specific Char'
                        && item.display === '-') {
                    replacement = builders.charSetRange(
                        items[i - 1], items[i + 1])
                    items.splice(i - 1, 3, replacement)

                    // On the next loop, want i to point to 2 elms ahead of replacement.
                    // replacement is now at (i - 1) -> 2 ahead is (i + 1)
                    // compensate for i++ by subtr 1 -> don't move i
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
    parser.yy = {
        b: builders
    }

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

            // reset these values that make parser stateful
            terms_s.length = 0
            numCapturedGroups = 0
        }
        return function() {
            var parsed = orig.apply(this, arguments)
            postParse()
            return parsed
        }
    })(parser.parse)
})()
