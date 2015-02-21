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
            var options = {
                'select': 'Select',
                'add': 'Add/Replace',
                'delete': 'Delete'
            }
            var radios = Object.keys(options).map(function(mode, i) {
                var label = options[mode]
                return (
                    <label key={i}>
                        <input type="radio" name="pattern-editor-mode"
                            value={mode}
                            checked={self.props.patternEditorMode === mode}
                            onChange={self.handleChange} />
                        <span>{label}</span>
                    </label>
                )
            })
            var canUndo = this.props.patternEditorMode !== 'select'
                && this.props.historyCount > 0
            return (
                <fieldset className="pattern-editor-mode-picker">
                    {radios}
                    <button
                        onClick={this.props.onUndo}
                        disabled={! canUndo}>
                        Undo
                    </button>
                </fieldset>
            )
        }
    })
})(window.reactClasses = window.reactClasses || {})
