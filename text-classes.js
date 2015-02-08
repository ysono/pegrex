;(function(reactClasses) {
    var Texts = React.createClass({
        handleChange: function(parts) {
            this.props.onChange(parts)
            // parent compo owns the states of parts.*
        },
        render: function() {
            var parts = {
                pattern: this.props.pattern,
                flags: this.props.flags
            }
            return (
                <div className="texts-parent">
                    <Literal parts={parts} onChange={this.handleChange} />
                    <Constructor parts={parts} onChange={this.handleChange} />
                </div>
            )
        }
    })

    function parseInputValues(refs) {
        var result = Object.keys(refs).reduce(function(map, refName) {
            map[refName] = refs[refName].getDOMNode().value
            return map
        }, {})
        result.flags = result.flags.split('')
        return result
    }
    var Literal = React.createClass({
        handleChange: function() {
            var parts = parseInputValues(this.refs)
            this.props.onChange(parts)
        },
        render: function() {
            var parts = this.props.parts
            var pattern = parts.pattern || '(?:)'
            var flags = parts.flags.join('')
            return (
                <fieldset>
                    <legend>Literal</legend>
                    <span>/</span>
                    <input ref="pattern" type="text"
                        value={pattern} onChange={this.handleChange} />
                    <span>/</span>
                    <input ref="flags" type="text"
                        value={flags} onChange={this.handleChange} />
                </fieldset>
            )
        }
    })
    var Constructor = React.createClass({
        getInitialState: function() {
            return {
                escapeInProgress: false
            }
        },
        handleChange: function() {
            function unescape(str) {
                // eval() would not be wise
                return str.replace(/\\\\/g, '\\')
            }
            function isEscapeInProgress(pattern) {
                return /[^\\]\\$/.test(pattern)
            }
            var parts = parseInputValues(this.refs)
            var escInP = isEscapeInProgress(parts.pattern)

            if (! escInP) {
                parts.pattern = unescape(parts.pattern)
                this.props.onChange(parts)
            }
            this.setState({
                escapeInProgress: escInP
            })
        },
        render: function() {
            var parts = this.props.parts
            function escape(str) {
                return str.replace(/\\/g, '\\\\')
            }
            var pattern = escape(parts.pattern)
                + (this.state.escapeInProgress ? '\\' : '')
            var flags = parts.flags.join('')
            return (
                <fieldset>
                    <legend>Constructor</legend>
                    <span>{'new RegExp('}</span>
                    <input ref="pattern" type="text"
                        value={pattern} onChange={this.handleChange} />
                    <span>,</span>
                    <input ref="flags" type="text"
                        value={flags} onChange={this.handleChange} />
                    <span>{')'}</span>
                </fieldset>
            )
        }
    })
    reactClasses.Texts = Texts
})(window.reactClasses = window.reactClasses || {})
