(function(reactClasses) {
    var Texts = React.createClass({
        handleChange: function(parts) {
            this.props.onChange(parts)
        },
        render: function() {
            var parts = {
                pattern: this.props.pattern,
                flags: this.props.flags
            }
            return (
                <div>
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
        render: function() {
            var parts = this.props.parts
            var pattern = parts.pattern || '(?:)'
            return (
                <fieldset>
                    <legend>Literal</legend>
                    <span>/</span>
                    <input type="text" value={pattern} />
                    <span>/</span>
                    <input type="text" value={parts.flags.join('')} />
                </fieldset>
            )
        }
    })
    var Constructor = React.createClass({
        handleChange: function() {
            this.props.onChange(
                parseInputValues(this.refs))
        },
        render: function() {
            var parts = this.props.parts
            function escape(str) {
                return str.replace(/\\/g, '\\\\')
            }
            function unescape() {
                // eval() would not be wise
                return str.replace(/\\\\/g, '\\')
            }
            return (
                <fieldset>
                    <legend>Constructor</legend>
                    <span>{'new RegExp('}</span>
                    <input ref="pattern" type="text"
                        value={escape(parts.pattern)} onChange={this.handleChange} />
                    <span>,</span>
                    <input ref="flags" type="text"
                        value={parts.flags.join('')} onChange={this.handleChange} />
                    <span>{')'}</span>
                </fieldset>
            )
        }
    })
    reactClasses.Texts = Texts
})(window.reactClasses = window.reactClasses || {})