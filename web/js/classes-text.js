;(function(reactClasses) {
    'use strict'

    var Texts = React.createClass({
        render: function() {
            return (
                <div className="texts-parent">
                    <Literal
                        pattern={this.props.pattern}
                        flags={this.props.flags}
                        validPattern={this.props.validPattern}
                        validFlags={this.props.validFlags}
                        patternSel={this.props.patternSel}
                        onChange={this.props.onChange}
                        onSelect={this.props.onSelect} />
                    <hr />
                    <Ctor
                        pattern={this.props.pattern}
                        flags={this.props.flags}
                        validPattern={this.props.validPattern}
                        validFlags={this.props.validFlags}
                        onChange={this.props.onChange} />
                </div>
            )
        }
    })

    function sel(input, range) {
        input.focus() // ff requires it
        input.setSelectionRange.apply(input, range)
    }
    function getRefVals(refs) {
        return Object.keys(refs).reduce(function(map, refName) {
            map[refName] = refs[refName].getDOMNode().value
            return map
        }, {})
    }
    var Literal = React.createClass({
        handleChange: function() {
            var parts = getRefVals(this.refs)
            this.props.onChange(parts)
        },
        handleSelect: function(e) {
            // note: chrome doesn't remember which direction a mouse selected -> always 'none'
            //     also, 1. select fwd using keyboard 2. select to home (shift+home or cmd+shift+left)
            //         --> seln is not anchored on original point.

            // info: if blur was for clicking on svg, blur fires before re-focus, so it works

            // need to handle blur b/c otherwise infinite loop
            // TODO test
            var elm = e.target
            var patternSel = e.type === 'blur'
                ? null
                : [elm.selectionStart, elm.selectionEnd, elm.selectionDirection]
            this.props.onSelect(patternSel)
        },
        render: function() {
            if (this.props.patternSel) {
                sel(this.refs.pattern.getDOMNode(), this.props.patternSel)
            }

            function className(propName, valid) {
                return propName + (valid ? '' : ' error')
            }
            var classNames = {
                pattern: className('pattern', this.props.validPattern),
                flags: className('flags', this.props.validFlags)
            }

            return (
                <fieldset className="literal">
                    <span className="prefix">/</span>
                    <input type="text" ref="pattern" placeholder={'(?:)'}
                        value={this.props.pattern}
                        onChange={this.handleChange}
                        onSelect={this.handleSelect}
                        className={classNames.pattern} />
                    <span className="infix">/</span>
                    <input type="text" ref="flags"
                        value={this.props.flags}
                        onChange={this.handleChange}
                        className={classNames.flags} />
                    <span className="suffix"></span>
                </fieldset>
            )
        }
    })
    var Ctor = React.createClass({
        /*
            In simple conditions, we can let react loop back our updates.
            
            E.g. a val in DOM is changed to `a\\`
                -> update parent component that val has changed to the unescaped val of `a\`
                -> looped back render fn sees that val (in this.props) is `a\`
                -> escape, then set DOM val to `a\\`
                -> what you type is what you get
            
            But in many conditions, the escaped and unescaped vals are not inverses of each other.
            
            E.g. val in DOM is `a\`
                B/c this val is invalid, we want to update the parent component that the
                    escaped value is blank (and we want the graphical represenation to be blank).
                    But then loop back will override the DOM val with blank; making it
                    impossible to type a `\`.
                Even if we wanted to update not with blank but with a hacked unescaped val that
                    escapes back to the original `a\`, such a val does not exist.
            
            Solution:
            On change, save the current escaped part (this.state.esc*),
                and the converted unescaped part (this.state.prev*).
            On render, compare the saved escaped part against the received part.
                If they're different, then use the received part. It can be assumed
                    that the received part came from some mechanism besides loop back (e.g. hash).
                If they're the same, then use the saved escaped part.
        */
        getInitialState: function() {
            return {
                prevParts: {foo: 'bar'},
                escParts: {foo: 'bar'},
                escValidParts: {foo: 'bar'}
            }
        },

        escape: function(part) {
            return part.replace(/\\/g, '\\\\')
        },
        getUnescapedParts: function(escParts) {
            function unescape(str) {
                // TODO test

                // String literal with an odd number of slashes at the end is invalid.
                // TODO highlight it
                if (/(?:^|[^\\])(?:\\{2})*\\$/.test(str)) {
                    return
                }

                // Does not correctly escape a string, as eval() would do,
                // but still produces an equivalent regex literal.
                // e.g. stripping: (\a -> a) (\\a -> a) (\\ -> \)
                //     not stripping: (\n -> \n) (\7 -> \7)
                // See [ecma](http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4)
                return str.replace(/\\([^'"bfnrtvxu0-7])/g, '$1')
            }
            return {
                pattern: unescape(escParts.pattern),
                flags: unescape(escParts.flags)
            }
        },

        handleChange: function() {
            var escParts = getRefVals(this.refs)
            var parts = this.getUnescapedParts(escParts)
            var escValidParts = {
                pattern: parts.pattern != null,
                flags: parts.flags != null
            }
            var prevParts = {}
            prevParts.pattern = parts.pattern = parts.pattern || ''
            prevParts.flags = parts.flags = parts.flags || ''
            this.setState({
                prevParts: prevParts,
                escParts: escParts,
                escValidParts: escValidParts
            })
            this.props.onChange(parts)
        },
        render: function() {
            var self = this

            var valids = {
                pattern: this.props.validPattern,
                flags: this.props.validFlags
            }

            var escParts = {}, classNames = {}
            ;['pattern', 'flags'].forEach(function(partName) {
                if (self.state.prevParts[partName] === self.props[partName]) {
                    escParts[partName] = self.state.escParts[partName]
                    valids[partName] = valids[partName]
                        && self.state.escValidParts[partName]
                } else {
                    escParts[partName] = self.escape(self.props[partName])
                }

                classNames[partName] = partName + (valids[partName] ? '' : ' error')
            })

            return (
                <fieldset className="ctor">
                    <span className="prefix">{"new RegExp('"}</span>
                    <input type="text" ref="pattern" 
                        value={escParts.pattern}
                        onChange={this.handleChange}
                        className={classNames.pattern} />
                    <span className="infix">','</span>
                    <input type="text" ref="flags"
                        value={escParts.flags}
                        onChange={this.handleChange}
                        className={classNames.flags} />
                    <span className="suffix">{"')"}</span>
                </fieldset>
            )
        }
    })
    reactClasses.Texts = Texts
})(window.reactClasses = window.reactClasses || {})
