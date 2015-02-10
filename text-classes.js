;(function(reactClasses) {
    'use strict'
    
    var Texts = React.createClass({
        getInitialState: function() {
            return {
                escapedPattern: this.escape(this.props.pattern),
                escapedFlags: this.escape(this.props.flags.join(''))
            }
        },
        escape: function(str) {
            return str.replace(/\\/g, '\\\\')
        },
        unescape: function(str) {
            // TODO add test

            // String literal with an odd number of slashes at the end is invalid.
            // TODO highlight it
            if (/(?:^|[^\\])(?:\\{2})*\\$/.test(str)) {
                return ''
            }

            // Does not correctly escape a string, as eval() would do,
            // but still produces an equivalent regex literal.
            // e.g. stripping: (\a -> a) (\\a -> a) (\\ -> \)
            //     not stripping: (\n -> \n) (\7 -> \7)
            // See [ecma](http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4)
            return str.replace(/\\([^'"bfnrtvxu0-7])/g, '$1')
        },
        bubbleUp: function(parts) {
            parts.flags = parts.flags.split('')
            this.props.onChange(parts)
        },
        handleLiteralChange: function(parts) {
            this.setState({
                escapedPattern: this.escape(parts.pattern),
                escapedFlags: parts.flags
            })
            this.bubbleUp(parts)
        },
        handleCtorChange: function(parts) {
            this.setState({
                escapedPattern: parts.pattern,
                escapedFlags: parts.flags
            })
            parts.pattern = this.unescape(parts.pattern)
            parts.flags = this.unescape(parts.flags)
            this.bubbleUp(parts)
        },
        render: function() {
            var flags = this.props.flags.join('')
            return (
                <div className="texts-parent">
                    <Literal
                        pattern={this.props.pattern} flags={flags}
                        onChange={this.handleLiteralChange} />
                    <Constructor
                        pattern={this.state.escapedPattern} flags={this.state.escapedFlags}
                        onChange={this.handleCtorChange} />
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
        handleChange: function() {
            var parts = getRefVals(this.refs)
            this.props.onChange(parts)
        },
        render: function() {
            return (
                <fieldset>
                    <legend>Constructor</legend>
                    <span>{'new RegExp('}</span>
                    <input ref="pattern" type="text"
                        value={this.props.pattern} onChange={this.handleChange} />
                    <span>,</span>
                    <input ref="flags" type="text"
                        value={this.props.flags} onChange={this.handleChange} />
                    <span>{')'}</span>
                </fieldset>
            )
        }
    })
    reactClasses.Texts = Texts
})(window.reactClasses = window.reactClasses || {})
