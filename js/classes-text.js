;(function(reactClasses) {
    'use strict'

    var Texts = React.createClass({
        render: function() {
            return (
                <div className="texts-parent">
                    <Literal
                        pattern={this.props.pattern} flags={this.props.flags}
                        patternSel={this.props.patternSel}
                        onChange={this.props.onChange} onSelect={this.props.onSelect} />
                    <hr />
                    <Ctor
                        pattern={this.props.pattern} flags={this.props.flags}
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
            //     also, 1. select fwd using keyboard 2. select to home (shift+home or cmd+shift+left) --> wrong

            // info: if blur was for clicking on svg, blur fires before re-focus, so it works

            /* need to handle blur b/c otherwise
                chrome doesn't let you escape focus
                ff keeps selection on blur
                ie11 just kinda freezes and dies?
            */
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
            return (
                <fieldset className="literal">
                    <legend>Literal</legend>
                    <span>
                        <span className="prefix">/</span>
                        <input ref="pattern" type="text" className="pattern"
                            placeholder={'(?:)'}
                            value={this.props.pattern} onChange={this.handleChange}
                            onSelect={this.handleSelect} onBlur={this.handleSelect} />
                        <span className="infix">/</span>
                        <input ref="flags" type="text" className="flags"
                            value={this.props.flags} onChange={this.handleChange} />
                        <span className="suffix"></span>
                    </span>
                </fieldset>
            )
        }
    })
    var Ctor = React.createClass({
        /*
            In a simple conditions, we can let react loop back our updates.
            
            E.g. a val in DOM is changed to `a\\`
                -> update parent component that val has changed to the unescaped val of `a\`
                -> looped back render fn sees that val (in this.props) is `a\`
                -> escape, then set DOM val to `a\\`
                -> what you type is what you get
            
            But in many conditions, the escaped and unescaped vals are not inverses of each other.
            
            E.g. val in DOM is `a\`
                -> cannot unescape. There is no possible loop back that
                    will give back `a\` in render fn.
            
            Hence we need a state to keep current unescaped val, whether valid or invalid.
                --> use this.state.escParts
            
            In render fn, determine when to use val provided in props, and when to use this.state.escParts.
                --> use this.state.prevParts.
            If this.state.prevParts equals parts in props, then use this.state.escParts.
            
            When updating, if we want the next call of render to use this.state.escParts,
            set this.state.prevParts to the current parts.
        */
        getInitialState: function() {
            return {
                prevParts: {},
                escParts: {}
            }
        },

        getEscapedParts: function(parts) {
            function escape(str) {
                return str.replace(/\\/g, '\\\\')
            }
            return {
                pattern: escape(parts.pattern),
                flags: escape(parts.flags)
            }
        },
        getUnescapedParts: function(escParts) {
            function unescape(str) {
                // TODO add test

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
            var isEscapable = parts.pattern != null && parts.flags != null
            if (isEscapable) {
                this.setState({
                    prevParts: parts,
                    escParts: escParts
                })
                this.props.onChange(parts)
            } else {
                this.setState({
                    prevParts: {
                        pattern: this.props.pattern,
                        flags: this.props.flags
                    },
                    escParts: escParts
                })
            }
        },
        render: function() {
            var prevParts = this.state.prevParts
            var escParts
            if (prevParts.pattern === this.props.pattern
                && prevParts.flags === this.props.flags) {
                escParts = this.state.escParts
            } else {
                escParts = this.getEscapedParts(this.props)
            }
            return (
                <fieldset className="ctor">
                    <legend>Constructor</legend>
                    <span>
                        <span className="prefix">new RegExp('</span>
                        <input ref="pattern" type="text" className="pattern"
                            value={escParts.pattern} onChange={this.handleChange} />
                        <span className="infix">','</span>
                        <input ref="flags" type="text" className="flags"
                            value={escParts.flags} onChange={this.handleChange} />
                        <span className="suffix">')</span>
                    </span>
                </fieldset>
            )
        }
    })
    reactClasses.Texts = Texts
})(window.reactClasses = window.reactClasses || {})
