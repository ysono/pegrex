/* parser generated by jison 0.4.15 */
/*
  Returns a Parser object of the following structure:

  Parser: {
    yy: {}
  }

  Parser.prototype: {
    yy: {},
    trace: function(),
    symbols_: {associative list: name ==> number},
    terminals_: {associative list: number ==> name},
    productions_: [...],
    performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$),
    table: [...],
    defaultActions: {...},
    parseError: function(str, hash),
    parse: function(input),

    lexer: {
        EOF: 1,
        parseError: function(str, hash),
        setInput: function(input),
        input: function(),
        unput: function(str),
        more: function(),
        less: function(n),
        pastInput: function(),
        upcomingInput: function(),
        showPosition: function(),
        test_match: function(regex_match_array, rule_index),
        next: function(),
        lex: function(),
        begin: function(condition),
        popState: function(),
        _currentRules: function(),
        topState: function(),
        pushState: function(condition),

        options: {
            ranges: boolean           (optional: true ==> token location info will include a .range[] member)
            flex: boolean             (optional: true ==> flex-like lexing behaviour where the rules are tested exhaustively to find the longest match)
            backtrack_lexer: boolean  (optional: true ==> lexer regexes are tested in order and for each matching regex the action code is invoked; the lexer terminates the scan when a token is returned by the action code)
        },

        performAction: function(yy, yy_, $avoiding_name_collisions, YY_START),
        rules: [...],
        conditions: {associative list: name ==> set},
    }
  }


  token location info (@$, _$, etc.): {
    first_line: n,
    last_line: n,
    first_column: n,
    last_column: n,
    range: [start_number, end_number]       (where the numbers are indexes into the input string, regular zero-based)
  }


  the parseError function receives a 'hash' object with these members for lexer and parser errors: {
    text:        (matched text)
    token:       (the produced terminal token, if any)
    line:        (yylineno)
  }
  while parser (grammar) errors will also provide these members, i.e. parser errors deliver a superset of attributes: {
    loc:         (yylloc)
    expected:    (string describing the set of expected tokens)
    recoverable: (boolean: TRUE when the parser has a error recovery rule available for this particular error)
  }
*/
var parser = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[2,6],$V1=[5,8,19],$V2=[5,8,16,17,18,19,20,22,23,24,25,27,28,29,30,31,32],$V3=[8,16,17,18,19,20,22,23,24,25,27,28,29,30,31,32],$V4=[5,8,14,15,16,17,18,19,20,22,23,24,25,27,28,29,30,31,32];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"Pattern":3,"Disjunction":4,"EOF":5,"Alternative_s":6,"Alternative":7,"ALT_DELIM":8,"Term_s":9,"Term":10,"Assertion":11,"Atom":12,"Quantifier":13,"ATOM_QUANT_SHORT":14,"ATOM_QUANT_NUM":15,"ASSERTN_LB":16,"ASSERTN_WB":17,"ASSERTN_LF_BEGIN":18,"CLOSE_PAREN":19,"ATOM_CHAR_ANY":20,"AtomEscape":21,"ATOM_GROUP_CAPTR":22,"ATOM_GROUP_NONCAPTR":23,"ATOM_ETC":24,"ATOM_ESCAPE_DECIMALS":25,"CharacterEscapeOrChracterClassEscape":26,"ESC_DECI":27,"ESC_CTRL":28,"ESC_HEX4":29,"ESC_HEX2":30,"ESC_CLASS":31,"ESC_ETC":32,"$accept":0,"$end":1},
terminals_: {2:"error",5:"EOF",8:"ALT_DELIM",14:"ATOM_QUANT_SHORT",15:"ATOM_QUANT_NUM",16:"ASSERTN_LB",17:"ASSERTN_WB",18:"ASSERTN_LF_BEGIN",19:"CLOSE_PAREN",20:"ATOM_CHAR_ANY",22:"ATOM_GROUP_CAPTR",23:"ATOM_GROUP_NONCAPTR",24:"ATOM_ETC",25:"ATOM_ESCAPE_DECIMALS",27:"ESC_DECI",28:"ESC_CTRL",29:"ESC_HEX4",30:"ESC_HEX2",31:"ESC_CLASS",32:"ESC_ETC"},
productions_: [0,[3,2],[4,1],[6,1],[6,3],[7,1],[9,0],[9,2],[10,1],[10,1],[10,2],[13,1],[13,1],[11,1],[11,1],[11,3],[12,1],[12,1],[12,3],[12,3],[12,1],[21,1],[21,1],[26,1],[26,1],[26,1],[26,1],[26,1],[26,1]],
performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */, _$ /* lstack */) {
/* this == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
return $$[$0-1]
break;
case 2:
this.$ = b().withLoc(_$[$0]).disjunction($$[$0])
break;
case 3:
this.$ = [$$[$0]]
break;
case 4:
this.$ = $$[$0-2].concat($$[$0-1])
break;
case 5:
this.$ = b().withLoc(_$[$0]).alternative($$[$0])
break;
case 6:
this.$ = []
break;
case 7:
this.$ = $$[$0-1].concat(b().withLoc(_$[$0]).get($$[$0]) )
break;
case 10:
 this.$ = b().quantified(
                b().withLoc(_$[$0-1]).get($$[$0-1]),
                b().withLoc(_$[$0]).quantifier($$[$0]) ) 
break;
case 13:
this.$ = b().withLoc(_$[$0]).assertionLB($$[$0])
break;
case 14:
this.$ = b().withLoc(_$[$0]).assertionWB($$[$0])
break;
case 15:
this.$ = b().withLoc(_$[$0-2],_$[$0]).assertionLF($$[$0-2], $$[$0-1])
break;
case 16:
this.$ = b().anyChar()
break;
case 18:
this.$ = b().group(true, $$[$0-1])
break;
case 19:
this.$ = b().group(false, $$[$0-1])
break;
case 20:
this.$ = b().specificChar($$[$0])
break;
case 21:
this.$ = b().decimalsEscape($$[$0])
break;
case 22:
this.$ = b().specificChar($$[$0], true)
break;
}
},
table: [o([5,8,16,17,18,20,22,23,24,25,27,28,29,30,31,32],$V0,{3:1,4:2,6:3,7:4,9:5}),{1:[3]},{5:[1,6]},o([5,19],[2,2],{8:[1,7]}),o($V1,[2,3]),o($V1,[2,5],{10:8,11:9,12:10,21:15,26:20,16:[1,11],17:[1,12],18:[1,13],20:[1,14],22:[1,16],23:[1,17],24:[1,18],25:[1,19],27:[1,21],28:[1,22],29:[1,23],30:[1,24],31:[1,25],32:[1,26]}),{1:[2,1]},o($V2,$V0,{9:5,7:27}),o($V2,[2,7]),o($V2,[2,8]),o($V2,[2,9],{13:28,14:[1,29],15:[1,30]}),o($V2,[2,13]),o($V2,[2,14]),o($V3,$V0,{6:3,7:4,9:5,4:31}),o($V4,[2,16]),o($V4,[2,17]),o($V3,$V0,{6:3,7:4,9:5,4:32}),o($V3,$V0,{6:3,7:4,9:5,4:33}),o($V4,[2,20]),o($V4,[2,21]),o($V4,[2,22]),o($V4,[2,23]),o($V4,[2,24]),o($V4,[2,25]),o($V4,[2,26]),o($V4,[2,27]),o($V4,[2,28]),o($V1,[2,4]),o($V2,[2,10]),o($V2,[2,11]),o($V2,[2,12]),{19:[1,34]},{19:[1,35]},{19:[1,36]},o($V2,[2,15]),o($V4,[2,18]),o($V4,[2,19])],
defaultActions: {6:[2,1]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        throw new Error(str);
    }
},
parse: function parse(input) {
    var self = this, stack = [0], tstack = [], vstack = [null], lstack = [], table = this.table, yytext = '', yylineno = 0, yyleng = 0, recovering = 0, TERROR = 2, EOF = 1;
    var args = lstack.slice.call(arguments, 1);
    var lexer = Object.create(this.lexer);
    var sharedState = { yy: {} };
    for (var k in this.yy) {
        if (Object.prototype.hasOwnProperty.call(this.yy, k)) {
            sharedState.yy[k] = this.yy[k];
        }
    }
    lexer.setInput(input, sharedState.yy);
    sharedState.yy.lexer = lexer;
    sharedState.yy.parser = this;
    if (typeof lexer.yylloc == 'undefined') {
        lexer.yylloc = {};
    }
    var yyloc = lexer.yylloc;
    lstack.push(yyloc);
    var ranges = lexer.options && lexer.options.ranges;
    if (typeof sharedState.yy.parseError === 'function') {
        this.parseError = sharedState.yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError;
    }
    function popStack(n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
        lstack.length = lstack.length - n;
    }
    _token_stack:
        function lex() {
            var token;
            token = lexer.lex() || EOF;
            if (typeof token !== 'number') {
                token = self.symbols_[token] || token;
            }
            return token;
        }
    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;
    while (true) {
        state = stack[stack.length - 1];
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol === null || typeof symbol == 'undefined') {
                symbol = lex();
            }
            action = table[state] && table[state][symbol];
        }
                    if (typeof action === 'undefined' || !action.length || !action[0]) {
                var errStr = '';
                expected = [];
                for (p in table[state]) {
                    if (this.terminals_[p] && p > TERROR) {
                        expected.push('\'' + this.terminals_[p] + '\'');
                    }
                }
                if (lexer.showPosition) {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ':\n' + lexer.showPosition() + '\nExpecting ' + expected.join(', ') + ', got \'' + (this.terminals_[symbol] || symbol) + '\'';
                } else {
                    errStr = 'Parse error on line ' + (yylineno + 1) + ': Unexpected ' + (symbol == EOF ? 'end of input' : '\'' + (this.terminals_[symbol] || symbol) + '\'');
                }
                this.parseError(errStr, {
                    text: lexer.match,
                    token: this.terminals_[symbol] || symbol,
                    line: lexer.yylineno,
                    loc: yyloc,
                    expected: expected
                });
            }
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: ' + state + ', token: ' + symbol);
        }
        switch (action[0]) {
        case 1:
            stack.push(symbol);
            vstack.push(lexer.yytext);
            lstack.push(lexer.yylloc);
            stack.push(action[1]);
            symbol = null;
            if (!preErrorSymbol) {
                yyleng = lexer.yyleng;
                yytext = lexer.yytext;
                yylineno = lexer.yylineno;
                yyloc = lexer.yylloc;
                if (recovering > 0) {
                    recovering--;
                }
            } else {
                symbol = preErrorSymbol;
                preErrorSymbol = null;
            }
            break;
        case 2:
            len = this.productions_[action[1]][1];
            yyval.$ = vstack[vstack.length - len];
            yyval._$ = {
                first_line: lstack[lstack.length - (len || 1)].first_line,
                last_line: lstack[lstack.length - 1].last_line,
                first_column: lstack[lstack.length - (len || 1)].first_column,
                last_column: lstack[lstack.length - 1].last_column
            };
            if (ranges) {
                yyval._$.range = [
                    lstack[lstack.length - (len || 1)].range[0],
                    lstack[lstack.length - 1].range[1]
                ];
            }
            r = this.performAction.apply(yyval, [
                yytext,
                yyleng,
                yylineno,
                sharedState.yy,
                action[1],
                vstack,
                lstack
            ].concat(args));
            if (typeof r !== 'undefined') {
                return r;
            }
            if (len) {
                stack = stack.slice(0, -1 * len * 2);
                vstack = vstack.slice(0, -1 * len);
                lstack = lstack.slice(0, -1 * len);
            }
            stack.push(this.productions_[action[1]][0]);
            vstack.push(yyval.$);
            lstack.push(yyval._$);
            newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
            stack.push(newState);
            break;
        case 3:
            return true;
        }
    }
    return true;
}};


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
        },

        anyChar: function() {
            return {
                type: 'Any Char',
                display: '.'
            }
        },
        specificChar: function(display, isEscaped) {
            return {
                type: 'Specific Char',
                display: (isEscaped ? '\\' : '') + display,
                isEscaped: !! isEscaped
            }
        },

        decimalsEscape: function(decimals) {
            // TODO octal
            return {
                type: 'asdf',
                decimals: decimals
            }
        }
    }
    return builders
}
/* generated by jison-lex 0.3.4 */
var lexer = (function(){
var lexer = ({

EOF:1,

parseError:function parseError(str, hash) {
        if (this.yy.parser) {
            this.yy.parser.parseError(str, hash);
        } else {
            throw new Error(str);
        }
    },

// resets the lexer, sets new input
setInput:function (input, yy) {
        this.yy = yy || this.yy || {};
        this._input = input;
        this._more = this._backtrack = this.done = false;
        this.yylineno = this.yyleng = 0;
        this.yytext = this.matched = this.match = '';
        this.conditionStack = ['INITIAL'];
        this.yylloc = {
            first_line: 1,
            first_column: 0,
            last_line: 1,
            last_column: 0
        };
        if (this.options.ranges) {
            this.yylloc.range = [0,0];
        }
        this.offset = 0;
        return this;
    },

// consumes and returns one char from the input
input:function () {
        var ch = this._input[0];
        this.yytext += ch;
        this.yyleng++;
        this.offset++;
        this.match += ch;
        this.matched += ch;
        var lines = ch.match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno++;
            this.yylloc.last_line++;
        } else {
            this.yylloc.last_column++;
        }
        if (this.options.ranges) {
            this.yylloc.range[1]++;
        }

        this._input = this._input.slice(1);
        return ch;
    },

// unshifts one char (or a string) into the input
unput:function (ch) {
        var len = ch.length;
        var lines = ch.split(/(?:\r\n?|\n)/g);

        this._input = ch + this._input;
        this.yytext = this.yytext.substr(0, this.yytext.length - len);
        //this.yyleng -= len;
        this.offset -= len;
        var oldLines = this.match.split(/(?:\r\n?|\n)/g);
        this.match = this.match.substr(0, this.match.length - 1);
        this.matched = this.matched.substr(0, this.matched.length - 1);

        if (lines.length - 1) {
            this.yylineno -= lines.length - 1;
        }
        var r = this.yylloc.range;

        this.yylloc = {
            first_line: this.yylloc.first_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.first_column,
            last_column: lines ?
                (lines.length === oldLines.length ? this.yylloc.first_column : 0)
                 + oldLines[oldLines.length - lines.length].length - lines[0].length :
              this.yylloc.first_column - len
        };

        if (this.options.ranges) {
            this.yylloc.range = [r[0], r[0] + this.yyleng - len];
        }
        this.yyleng = this.yytext.length;
        return this;
    },

// When called from action, caches matched text and appends it on next action
more:function () {
        this._more = true;
        return this;
    },

// When called from action, signals the lexer that this rule fails to match the input, so the next matching rule (regex) should be tested instead.
reject:function () {
        if (this.options.backtrack_lexer) {
            this._backtrack = true;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });

        }
        return this;
    },

// retain first n characters of the match
less:function (n) {
        this.unput(this.match.slice(n));
    },

// displays already matched input, i.e. for error messages
pastInput:function () {
        var past = this.matched.substr(0, this.matched.length - this.match.length);
        return (past.length > 20 ? '...':'') + past.substr(-20).replace(/\n/g, "");
    },

// displays upcoming input, i.e. for error messages
upcomingInput:function () {
        var next = this.match;
        if (next.length < 20) {
            next += this._input.substr(0, 20-next.length);
        }
        return (next.substr(0,20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
    },

// displays the character position where the lexing error occurred, i.e. for error messages
showPosition:function () {
        var pre = this.pastInput();
        var c = new Array(pre.length + 1).join("-");
        return pre + this.upcomingInput() + "\n" + c + "^";
    },

// test the lexed token: return FALSE when not a match, otherwise return token
test_match:function (match, indexed_rule) {
        var token,
            lines,
            backup;

        if (this.options.backtrack_lexer) {
            // save context
            backup = {
                yylineno: this.yylineno,
                yylloc: {
                    first_line: this.yylloc.first_line,
                    last_line: this.last_line,
                    first_column: this.yylloc.first_column,
                    last_column: this.yylloc.last_column
                },
                yytext: this.yytext,
                match: this.match,
                matches: this.matches,
                matched: this.matched,
                yyleng: this.yyleng,
                offset: this.offset,
                _more: this._more,
                _input: this._input,
                yy: this.yy,
                conditionStack: this.conditionStack.slice(0),
                done: this.done
            };
            if (this.options.ranges) {
                backup.yylloc.range = this.yylloc.range.slice(0);
            }
        }

        lines = match[0].match(/(?:\r\n?|\n).*/g);
        if (lines) {
            this.yylineno += lines.length;
        }
        this.yylloc = {
            first_line: this.yylloc.last_line,
            last_line: this.yylineno + 1,
            first_column: this.yylloc.last_column,
            last_column: lines ?
                         lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length :
                         this.yylloc.last_column + match[0].length
        };
        this.yytext += match[0];
        this.match += match[0];
        this.matches = match;
        this.yyleng = this.yytext.length;
        if (this.options.ranges) {
            this.yylloc.range = [this.offset, this.offset += this.yyleng];
        }
        this._more = false;
        this._backtrack = false;
        this._input = this._input.slice(match[0].length);
        this.matched += match[0];
        token = this.performAction.call(this, this.yy, this, indexed_rule, this.conditionStack[this.conditionStack.length - 1]);
        if (this.done && this._input) {
            this.done = false;
        }
        if (token) {
            return token;
        } else if (this._backtrack) {
            // recover context
            for (var k in backup) {
                this[k] = backup[k];
            }
            return false; // rule action called reject() implying the next rule should be tested instead.
        }
        return false;
    },

// return next match in input
next:function () {
        if (this.done) {
            return this.EOF;
        }
        if (!this._input) {
            this.done = true;
        }

        var token,
            match,
            tempMatch,
            index;
        if (!this._more) {
            this.yytext = '';
            this.match = '';
        }
        var rules = this._currentRules();
        for (var i = 0; i < rules.length; i++) {
            tempMatch = this._input.match(this.rules[rules[i]]);
            if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                match = tempMatch;
                index = i;
                if (this.options.backtrack_lexer) {
                    token = this.test_match(tempMatch, rules[i]);
                    if (token !== false) {
                        return token;
                    } else if (this._backtrack) {
                        match = false;
                        continue; // rule action called reject() implying a rule MISmatch.
                    } else {
                        // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
                        return false;
                    }
                } else if (!this.options.flex) {
                    break;
                }
            }
        }
        if (match) {
            token = this.test_match(match, rules[index]);
            if (token !== false) {
                return token;
            }
            // else: this is a lexer rule which consumes input without producing a token (e.g. whitespace)
            return false;
        }
        if (this._input === "") {
            return this.EOF;
        } else {
            return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), {
                text: "",
                token: null,
                line: this.yylineno
            });
        }
    },

// return next match that has a token
lex:function lex() {
        var r = this.next();
        if (r) {
            return r;
        } else {
            return this.lex();
        }
    },

// activates a new lexer condition state (pushes the new lexer condition state onto the condition stack)
begin:function begin(condition) {
        this.conditionStack.push(condition);
    },

// pop the previously active lexer condition state off the condition stack
popState:function popState() {
        var n = this.conditionStack.length - 1;
        if (n > 0) {
            return this.conditionStack.pop();
        } else {
            return this.conditionStack[0];
        }
    },

// produce the lexer rule set which is active for the currently active lexer condition state
_currentRules:function _currentRules() {
        if (this.conditionStack.length && this.conditionStack[this.conditionStack.length - 1]) {
            return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
        } else {
            return this.conditions["INITIAL"].rules;
        }
    },

// return the currently active lexer condition state; when an index argument is provided it produces the N-th previous condition state, if available
topState:function topState(n) {
        n = this.conditionStack.length - 1 - Math.abs(n || 0);
        if (n >= 0) {
            return this.conditionStack[n];
        } else {
            return "INITIAL";
        }
    },

// alias for begin(condition)
pushState:function pushState(condition) {
        this.begin(condition);
    },

// return the number of states currently on the stack
stateStackSize:function stateStackSize() {
        return this.conditionStack.length;
    },
options: {},
performAction: function anonymous(yy,yy_,$avoiding_name_collisions,YY_START) {
var YYSTATE=YY_START;
switch($avoiding_name_collisions) {
case 0:return 5
break;
case 1:this.begin('DISJ'); this.unput(yy_.yytext); return
break;
case 2:
                    popTill(this, 'DISJ')
                    this.popState()
                    return 19
                
break;
case 3:this.begin('ALT'); this.unput(yy_.yytext); return  
break;
case 4:
                    popTill('ALT')
                    return 8
                
break;
case 5:this.begin('TERM'); this.unput(yy_.yytext); return
break;
case 6:return 14
break;
case 7:return 15
break;
case 8:return 16
break;
case 9:return 17
break;
case 10:this.begin('DISJ'); return 18
break;
case 11:return 20
break;
case 12:this.begin('ESCAPED_ATOM'); return
break;
case 13:this.begin('DISJ'); this.unput(yy_.yytext[1]); return 22 /* note yy_.yytext[1] can be a `)` */
break;
case 14:this.begin('DISJ'); return 23
break;
case 15:return 24
break;
case 16:this.popState(); return 25
break;
case 17:this.popState(); this.begin('ESCAPED_NONDECI'); this.unput(yy_.yytext); return
break;
case 18:this.popState(); return 27 /* contrary to ecma, major browsers allow `0-9_` */
break;
case 19:this.popState(); return 28
break;
case 20:this.popState(); return 29
break;
case 21:this.popState(); return 30
break;
case 22:this.popState(); return 31
break;
case 23:this.popState(); return 32 /* an approx. ecma's defn is much more involved. */
break;
}
},
rules: [/^(?:$)/,/^(?:.)/,/^(?:[)])/,/^(?:.)/,/^(?:[|])/,/^(?:.)/,/^(?:[*+?])/,/^(?:[{][0-9]+(?:[,][0-9]*)?[}])/,/^(?:[$^])/,/^(?:[\\][bB])/,/^(?:[(][?][=!])/,/^(?:[\.])/,/^(?:[\\])/,/^(?:[(][^?])/,/^(?:[(][?][:])/,/^(?:.)/,/^(?:[0-9]+)/,/^(?:.)/,/^(?:[c][0-9A-Z_a-z])/,/^(?:[fnrtv])/,/^(?:[x][0-9A-Fa-f]{4})/,/^(?:[u][0-9A-Fa-f]{2})/,/^(?:[dDsSwW])/,/^(?:.)/],
conditions: {"ESCAPED_NONDECI":{"rules":[0,2,4,18,19,20,21,22,23],"inclusive":true},"ESCAPED_ATOM":{"rules":[0,2,4,16,17],"inclusive":true},"TERM":{"rules":[0,2,4,6,7,8,9,10,11,12,13,14,15],"inclusive":true},"ALT":{"rules":[0,2,4,5],"inclusive":true},"DISJ":{"rules":[0,2,3,4],"inclusive":true},"INITIAL":{"rules":[0,1,2,4],"inclusive":true}}
});
function popTill(lexer, state) {
    var st
    do {
        st = lexer.popState()
    } while (st !== state)
};
return lexer;
})();
parser.lexer = lexer;
function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = parser;
exports.Parser = parser.Parser;
exports.parse = function () { return parser.parse.apply(parser, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}