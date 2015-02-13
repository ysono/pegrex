;(function(reactClasses) {
    'use strict'

    var Texts = React.createClass({
        handleChange: function(parts) {
            this.props.onChange(parts)
        },
        render: function() {
            return (
                <div className="texts-parent">
                    <Literal
                        pattern={this.props.pattern} flags={this.props.flags}
                        sel={this.props.sel}
                        onChange={this.handleChange} />
                    <Ctor
                        pattern={this.props.pattern} flags={this.props.flags}
                        onChange={this.handleChange} />
                </div>
            )
        }
    })

    function sel(input, range) {
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
        render: function() {
            if (this.props.sel) {
                sel(this.refs.pattern.getDOMNode(), this.props.sel)
            }
            return (
                <fieldset>
                    <legend>Literal</legend>
                    <span>/</span>
                    <input ref="pattern" type="text"
                        placeholder={'(?:)'}
                        value={this.props.pattern} onChange={this.handleChange} />
                    <span>/</span>
                    <input ref="flags" type="text"
                        value={this.props.flags} onChange={this.handleChange} />
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
                <fieldset>
                    <legend>Constructor</legend>
                    <span>new RegExp(</span>
                    <input ref="pattern" type="text"
                        value={escParts.pattern} onChange={this.handleChange} />
                    <span>,</span>
                    <input ref="flags" type="text"
                        value={escParts.flags} onChange={this.handleChange} />
                    <span>)</span>
                </fieldset>
            )
        }
    })
    reactClasses.Texts = Texts
})(window.reactClasses = window.reactClasses || {})
