;(function(reactClasses) {
    'use strict'

    reactClasses.FlagsEditor = React.createClass({
        handleChange: function() {
            var self = this
            var flags = Object.keys(self.refs).reduce(function(flags, flag) {
                var checked = self.refs[flag].getDOMNode().checked
                return flags + (checked ? flag : '')
            }, '')
            this.props.onChange(flags)
        },
        render: function() {
            var self = this
            var labels = {
                'g': 'Global',
                'i': 'Ignore Case',
                'm': 'Multi-line'
            }
            var choices = Object.keys(labels).map(function(flag, i) {
                return (
                    <label key={i}>
                        <input type="checkbox"
                            disabled={! self.props.isFlagsValid}
                            checked={self.props.flags.indexOf(flag) >= 0}
                            onChange={self.handleChange}
                            ref={flag} />
                        <span>{labels[flag]}</span>
                    </label>
                )
            })
            return (
                <fieldset className="flags-editor">
                    {choices}
                </fieldset>
            )
        }
    })

    reactClasses.PatternEditorModePicker = React.createClass({
        handleChange: function(e) {
            var mode = e.target.value
            this.props.onChange(mode)
        },
        render: function() {
            var self = this
            var radios = ['Select', 'Add', 'Delete'].map(function(label, i) {
                var val = label.toLowerCase()
                return (
                    <label key={i}>
                        <input type="radio" name="pattern-editor-mode"
                            value={val}
                            checked={self.props.patternEditorMode === val}
                            onChange={self.handleChange} />
                        <span>{label}</span>
                    </label>
                )
            })
            return (
                <fieldset className="pattern-editor-mode-picker">
                    {radios}
                </fieldset>
            )
        }
    })
})(window.reactClasses = window.reactClasses || {})
