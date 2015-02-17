(function(reactClasses) {
    reactClasses.FlagsEditor = React.createClass({
        handleChange: function() {
            // TODO use form submit
            var labels = this.refs.form.getDOMNode().childNodes
            var flags = Array.prototype.reduce.call(labels, function(str, label) {
                var input = label.childNodes[0]
                return str + (input.checked ? input.name : '')
            }, '')
            this.props.onChange(flags)
        },
        render: function() {
            var self = this
            var vals = {
                'g': 'Global',
                'i': 'Ignore Case',
                'm': 'Multi-line'
            }
            var choices = Object.keys(vals).map(function(flag, i) {
                return (
                    <label key={i}>
                        <input type="checkbox" name={flag}
                            disabled={! self.props.validFlags}
                            checked={self.props.flags.indexOf(flag) >= 0}
                            onChange={self.handleChange} />
                        <span>{vals[flag]}</span>
                    </label>
                )
            })
            return (
                <form ref="form" className="flags-editor">
                    {choices}
                </form>
            )
        }
    })
})(window.reactClasses = window.reactClasses || {})
