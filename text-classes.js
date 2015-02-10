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
                        onChange={this.handleChange} />
                    <Constructor
                        pattern={this.props.pattern} flags={this.props.flags}
                        onChange={this.handleChange} />
                </div>
            )
        }
    })

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
    var Constructor = React.createClass({
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
            if (parts.pattern == null || parts.flags == null) {
                // escape failed.
                // 1. Want to `setState` to reflect escaped parts in dom.
                // 2. Expect the looped back `render` to choose current escaped parts.
                //     To do so, do not update `state.prevParts`.
                // TODO document better
                // TODO show error on text location
                this.setState({
                    escParts: escParts
                })
            } else {
                this.setState({
                    prevParts: parts,
                    escParts: escParts
                })
                this.props.onChange(parts)
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
                    <span>{'new RegExp('}</span>
                    <input ref="pattern" type="text"
                        value={escParts.pattern} onChange={this.handleChange} />
                    <span>,</span>
                    <input ref="flags" type="text"
                        value={escParts.flags} onChange={this.handleChange} />
                    <span>{')'}</span>
                </fieldset>
            )
        }
    })
    reactClasses.Texts = Texts
})(window.reactClasses = window.reactClasses || {})
