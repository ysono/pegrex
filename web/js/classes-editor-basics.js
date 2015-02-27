;(function(reactClasses) {
    'use strict'

    reactClasses.FlagsEditor = React.createClass({displayName: "FlagsEditor",
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
                    React.createElement("label", {key: i}, 
                        React.createElement("input", {type: "checkbox", 
                            disabled: ! self.props.isFlagsValid, 
                            checked: self.props.flags.indexOf(flag) >= 0, 
                            onChange: self.handleChange, 
                            ref: flag}), 
                        React.createElement("span", null, labels[flag])
                    )
                )
            })
            return (
                React.createElement("fieldset", {className: "flags-editor"}, 
                    choices
                )
            )
        }
    })

    reactClasses.PatternEditorModePicker = React.createClass({displayName: "PatternEditorModePicker",
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
                    React.createElement("label", {key: i}, 
                        React.createElement("input", {type: "radio", name: "pattern-editor-mode", 
                            value: mode, 
                            checked: self.props.patternEditorMode === mode, 
                            onChange: self.handleChange}), 
                        React.createElement("span", null, label)
                    )
                )
            })
            var canUndo = this.props.patternEditorMode !== 'select'
                && this.props.historyCount > 0
            return (
                React.createElement("fieldset", {className: "pattern-editor-mode-picker"}, 
                    radios, 
                    React.createElement("button", {
                        onClick: this.props.onUndo, 
                        disabled: ! canUndo}, 
                        "Undo"
                    )
                )
            )
        }
    })

    reactClasses.Hint = React.createClass({displayName: "Hint",
        getInitialState: function() {
            return {
                show: true
            }
        },
        handleToggle: function() {
            this.setState({
                show: ! this.state.show
            })
        },
        render: function() {
            var token = this.props.hoverToken || this.props.selToken
            var hint = this.state.show
                ? token && token.hint
                : null
            return React.createElement("div", {className: "hint"}, 
                hint ? React.createElement("p", null, hint) : null, 
                React.createElement("label", null, 
                    React.createElement("input", {type: "checkbox", 
                        checked: this.state.show, 
                        onChange: this.handleToggle}), 
                    React.createElement("span", null, "Show Hint")
                )
            )
        }
    })
})(window.reactClasses = window.reactClasses || {})
