;(function(reactClasses) {
    'use strict'

    var Controls = React.createClass({displayName: "Controls",
        /* states:
            pattern, tree, isPatternValid
                // Last 2 are always derived from pattern.
                // It's useful for Surface to receive tree as a prop
                //     and not be tied to pattern.
                //     See how Cell class in Palette uses Surface.
                // isPatternValid could be internalized in Texts class,
                //     but keeping it consistent with isFlagsValid.
            flags, isFlagsValid
            (hash), historyCount, rememberHistoryCount
                // Synced with pattern and flags, hash is treated as if a state.
            patternSel, selToken
                // patternSel represents user's selection range of the pattern text.
                // selToken represents user's selection of one specific token.
                // selToken is the clipboard of tokens, and hence must be kept free of
                //     non-token obj like UI data.
                // the two selections are separate concepts and hence not kept in sync.
            patternEditorMode
            hoverToken
        */
        getInitialState: function() {
            var state = reactClasses.hashUtil.parse() || {
                pattern: '^\\ty[pe] (he\\re).$',
                flags: ''
            }
            this.prepStateForTextsChange(state)
            state.patternEditorMode = 'select'
            state.historyCount = 0
            return state
        },
        componentDidMount: function() {
            window.addEventListener('hashchange', this.handleHashChange)
        },

        /* helpers for hash */

        /* modifies arg `newState`. caller must call setState after updateHash. */
        updateHash: function(newState, rememberPrev) {
            newState.pattern = typeof newState.pattern === 'string'
                ? newState.pattern : this.state.pattern
            newState.flags = typeof newState.flags === 'string'
                ? newState.flags : this.state.flags
            reactClasses.hashUtil.update(newState, rememberPrev)

            if (rememberPrev) {
                newState.historyCount = this.state.historyCount + 1
            } else {
                newState.historyCount = 0
            }
        },

        /* helpers for texts change */

        patternToTree: function(parts) {
            try {
                parts.tree = parser.parse(parts.pattern)
                surfaceData.setUiData(parts.tree)
                parts.isPatternValid = true
            } catch(e) {
                console.warn('parsing failed', e.stack)
                parts.tree = undefined
                parts.isPatternValid = false
            }
        },
        validateFlags: function(parts) {
            // The major browsers want 0..1 of each of 3 flags.
            var set = {}
            var isValid = parts.flags.split('').every(function(flag) {
                if (! /[gim]/.test(flag)) { return false }
                if (set[flag]) { return false }
                set[flag] = true
                return true
            })
            parts.isFlagsValid = isValid
        },
        /* returns undefined if no texts change occurred. */
        prepStateForTextsChange: function(newState) {
            var didChange = false
            if (this.state && this.state.pattern === newState.pattern) {
                delete newState.pattern
            } else {
                this.patternToTree(newState)
                newState.patternSel = null // do not force cursor/selection to stay in the same location
                newState.selToken = null // selToken doesn't need to be cleared if it's on palette,
                    // but that would require adding another state to keep track of it.
                didChange = true
            }
            if (this.state && this.state.flags === newState.flags) {
                delete newState.flags
            } else {
                this.validateFlags(newState)
                didChange = true
            }

            if (didChange) {
                return newState
            }
        },

        /* events from hash */

        handleHashChange: function() {
            var parts = reactClasses.hashUtil.parse()
            var newState = this.prepStateForTextsChange(parts)
            if (newState) {
                if (this.state.rememberHistoryCount) {
                    newState.rememberHistoryCount = false
                } else {
                    newState.historyCount = 0
                }
                this.setState(newState)
            }
        },

        /* events from texts */

        handleTextsChange: function(parts) {
            var newState = this.prepStateForTextsChange(parts)
            if (newState) {
                this.updateHash(newState)
                this.setState(newState)
            }
        },
        handlePatternTextSelect: function(patternSel) {
            this.setState({
                patternSel: patternSel
            })
        },

        /* events from surface */

        handleSurfaceSelect: function(token) {
            var textLoc = token.textLoc

            var mode = this.state.patternEditorMode
            var newState

            if (mode === 'select') {
                newState = {
                    patternSel: textLoc
                }
                if (token.type) {
                    newState.selToken = token
                }
                this.setState(newState)
                return
            }

            function spliceStr(str, range, replacement) {
                return str.slice(0, range[0])
                    + (replacement || '')
                    + str.slice(range[1])
            }
            var selTokenText
            if(mode === 'add') {
                if (this.state.selToken && textLoc) {
                    selTokenText = tokenCreator.toString(this.state.selToken)
                    newState = {
                        pattern: spliceStr(
                            this.state.pattern, textLoc, selTokenText),
                        patternSel: [textLoc[0],
                            textLoc[0] + selTokenText.length]
                    }
                    // note, by not clearing selToken, the previously selected token
                    //     continues to be available for add/repl/pasting. But it
                    //     can no longer be shown as selected, since the exact token
                    //     obj is no longer being rendered.
                }
            } else if(mode === 'delete') {
                if (textLoc) {
                    newState = {
                        pattern: spliceStr(
                            this.state.pattern, textLoc),
                        patternSel: [textLoc[0], textLoc[0]]
                    }
                }
            }
            if (newState) {
                this.patternToTree(newState)
                this.updateHash(newState, true)
                this.setState(newState)
            }
        },
        handleSurfaceHover: function(token, hoveringIn) {
            this.setState({
                hoverToken: hoveringIn ? token : null
            })
        },

        /* events from editors */

        handleFlagsEditorChange: function(flags) {
            var newState = {
                flags: flags
            }
            this.validateFlags(newState)
            this.updateHash(newState)
            this.setState(newState)
        },

        handlePatternEditorModeChange: function(mode) {
            this.setState({
                patternEditorMode: mode
            })
        },
        handlePatternEditorUndo: function() {
            this.setState({
                rememberHistoryCount: true,
                historyCount: this.state.historyCount - 1
            })
            window.history.back()
        },

        handlePatternEditorSelect: function(selToken) {
            this.setState({
                selToken: selToken
            })
        },

        render: function() {
            return (
                React.createElement("div", {className: "controls-parent"}, 
                    React.createElement("div", {className: "texts-parent-parent"}, 
                        /* texts-parent-parent exists purely for styling
                            so we can use padding rather than margin */
                        React.createElement(reactClasses.Texts, {
                            pattern: this.state.pattern, 
                            flags: this.state.flags, 
                            isPatternValid: this.state.isPatternValid, 
                            isFlagsValid: this.state.isFlagsValid, 
                            patternSel: this.state.patternSel, 
                            onChange: this.handleTextsChange, 
                            onPatternSelect: this.handlePatternTextSelect})
                    ), 
                    React.createElement("div", {className: "visuals-parent"}, 
                        React.createElement(reactClasses.Surface, {
                            tree: this.state.tree, 
                            patternSel: this.state.patternSel, 
                            patternEditorMode: this.state.patternEditorMode, 
                            onSelect: this.handleSurfaceSelect, 
                            onHover: this.handleSurfaceHover, 
                            isMainSurface: true}), 
                        React.createElement(reactClasses.FlagsEditor, {
                            flags: this.state.flags, 
                            isFlagsValid: this.state.isFlagsValid, 
                            onChange: this.handleFlagsEditorChange}), 
                        React.createElement(reactClasses.PatternEditorModePicker, {
                            patternEditorMode: this.state.patternEditorMode, 
                            historyCount: this.state.historyCount, 
                            onChange: this.handlePatternEditorModeChange, 
                            onUndo: this.handlePatternEditorUndo}), 
                        React.createElement(reactClasses.Hint, {
                            selToken: this.state.selToken, 
                            hoverToken: this.state.hoverToken})
                    ), 
                    React.createElement(reactClasses.PatternEditor, {
                        selToken: this.state.selToken, 
                        onSelect: this.handlePatternEditorSelect})
                )
            )
        }
    })
    reactClasses.Controls = Controls

})(window.reactClasses = window.reactClasses || {})
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
        saveSvg: function() {
            var svg = document.getElementById('main-surface')
            var svgData = new XMLSerializer().serializeToString(svg)
            var blob = new Blob([svgData], {
                type: 'image/svg+xml;charset=utf-8'
            })
            saveAs(blob, 'pegrex.svg')
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
                    ), 
                    React.createElement("hr", null), 
                    React.createElement("button", {onClick: this.saveSvg}, "Save Image")
                )
            )
        }
    })

    reactClasses.Hint = React.createClass({displayName: "Hint",
        getInitialState: function() {
            return {
                show: reactClasses.ls.readBool('showHint', true)
            }
        },
        handleToggle: function() {
            localStorage.setItem('showHint', ! this.state.show)
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
;(function(reactClasses) {
    'use strict'

    /*
    Important!!
    Tokens that are stored in states are there to be shared with many
        react components. When multiple components read the same token
        and want to render different Surfaces from it, the tokens must
        have different `.ui` assigned. To prevent the overriding of other
        components' UI data (e.g. pos and surfaceDim), tokens must always
        be cloned.
    For this concern, soft cloning with Object.create is sufficient.
    However, token can also be embedded within another, in which case,
        anything can be assumed to be modified. Object.create is no longer
        safe if a prop nested more than one level deep can be modified.
        E.g. `someToken.someArr[i]` or `someToken.someProp.someProp`.
        Real-world e.g. `Set of Chars` modifies `.inclusive` prop nested
        multiple levels deep.
    For this reason, we need deep cloning i.e. `_.merge`.

    The states in question are (in the chronological order of population)
        previewToken, tokensInPalette[i], selToken
    The operations in question are
        Cell draws tokens from any of the above 3 sources, adding `.ui`
            in the process.
        FormInputToken uses selToken to create previewToken.
            In other words, previewToken embeds selToken.
    */

    var PatternEditor = React.createClass({displayName: "PatternEditor",
        getInitialState: function() {
            return {
                tokenLabel: null,
                tokensInPalette: [],
                hidden: reactClasses.ls.readBool('editorHidden', false),
                pinned: reactClasses.ls.readBool('editorPinned', true)
            }
        },
        handleTogglePin: function() {
            localStorage.setItem('editorPinned', ! this.state.pinned)
            this.setState({
                pinned: ! this.state.pinned
            })
        },
        handleToggleShow: function() {
            localStorage.setItem('editorHidden', ! this.state.hidden)
            this.setState({
                hidden: ! this.state.hidden
            })
        },
        handleDeleteFromPalette: function(index) {
            this.state.tokensInPalette.splice(index, 1)
            this.setState({
                tokensInPalette: this.state.tokensInPalette
            })
            this.props.onSelect(null) // clear selToken
        },
        handleChangeTokenLabel: function(tokenLabel) {
            this.setState({
                tokenLabel: tokenLabel
            })
        },
        handleCreate: function(token) {
            this.setState({
                tokensInPalette: this.state.tokensInPalette.concat(token)
            })
        },
        render: function() {
            return (
                React.createElement("div", {className: "pattern-editor-parent", 
                    "data-hidden": this.state.hidden ? '' : null, 
                    "data-pinned": this.state.pinned ? '' : null}, 
                    React.createElement("div", {className: "pattern-editor-toggler-parent"}, 
                        React.createElement("button", {
                            onClick: this.handleTogglePin, 
                            className: "pattern-editor-pinner"}), 
                        React.createElement("button", {
                            onClick: this.handleToggleShow, 
                            className: "pattern-editor-toggler"})
                    ), 
                    React.createElement("div", {className: "pattern-editor"}, 
                        React.createElement(Palette, {
                            tokensInPalette: this.state.tokensInPalette, 
                            selToken: this.props.selToken, 
                            onSelect: this.props.onSelect, 
                            onDelete: this.handleDeleteFromPalette}), 
                        React.createElement("div", {className: "create-parent"}, 
                            React.createElement(FormChooser, {
                                onChange: this.handleChangeTokenLabel}), 
                            React.createElement(Form, {
                                tokenLabel: this.state.tokenLabel, 
                                selToken: this.props.selToken, 
                                onSelect: this.props.onSelect, 
                                onSubmit: this.handleCreate})
                        )
                    )
                )
            )
        }
    })
    var FormChooser = React.createClass({displayName: "FormChooser",
        shouldComponentUpdate: function() {
            return false
        },
        handleChangeTokenLabel: function(e) {
            this.props.onChange(e.target.value)
        },
        render: function() {
            var self = this
            var createOptions = tokenCreator.tokenLabels.map(function(tokenLabel) {
                return React.createElement("label", {key: tokenLabel}, 
                    React.createElement("input", {type: "radio", name: "palette-editor-create-type", 
                        value: tokenLabel, 
                        onChange: self.handleChangeTokenLabel}), 
                    React.createElement("span", null, tokenLabel)
                )
            })
            return React.createElement("fieldset", {className: "create-type-chooser"}, 
                React.createElement("legend", null, "Create"), 
                createOptions
            )
        }
    })

    var Form = React.createClass({displayName: "Form",
        /* states: params, previewToken, previewStr, previewErrMsg */
        getInitialState: function() {
            return {
                params: []
            }
        },
        componentWillReceiveProps: function(nextProps) {
            if (this.props.tokenLabel !== nextProps.tokenLabel) {
                this.setState({
                    params: tokenCreator.getParams(nextProps.tokenLabel)
                })
            }
        },

        handleChange: function(vals, allValid) {
            if (! this.props.tokenLabel) { return }

            var token = allValid
                ? tokenCreator.create(this.props.tokenLabel, vals)
                : null
            var newState = {}
            if (token instanceof Error) {
                newState.previewToken = null
                newState.previewStr = null
                newState.previewErrMsg = token.message
                    || 'The inputs are not valid as a whole.'
            } else {
                newState.previewToken = token
                newState.previewStr = token && tokenCreator.toString(token)
                newState.previewErrMsg = null
            }
            this.setState(newState)
        },
        handleSubmit: function(e) {
            e.preventDefault()
            this.props.onSubmit(this.state.previewToken)
        },

        render: function() {
            return (
                React.createElement("form", {onSubmit: this.handleSubmit, 
                    className: "create-form"}, 
                    React.createElement("div", {className: "create-form-inputs"}, 
                        React.createElement(FormInputs, {
                            params: this.state.params, 
                            selToken: this.props.selToken, 
                            onChange: this.handleChange}), 
                        React.createElement("input", {type: "submit", value: "Create in Palette", 
                            disabled: ! this.state.previewToken}), 
                        React.createElement("p", {ref: "overallError", className: "error"}, 
                            this.state.previewErrMsg)
                    ), 
                    React.createElement("div", {className: "create-form-preview"}, 
                        React.createElement("p", null, "Preview"), 
                        React.createElement("p", {className: "preview-str"}, this.state.previewStr), 
                        React.createElement(Cell, {token: this.state.previewToken, 
                            onSelect: this.props.onSelect})
                    )
                )
            )
        }
    })

    /*
        required in props
            selToken
            onChange
        required prop on `this`
            nestsMulti
        states: vals, validities
    */
    var formInputsMixin = {
        resetAll: function(params) {
            var self = this
            var vals = params.map(function(param) {
                return (self.nestsMulti && param.multi)
                    ? null // let FormInputMulti update
                    : param.default
            })
            var validities = params.map(function(param) {
                return (self.nestsMulti && param.multi)
                    ? false // let FormInputMulti update
                    : self.validateSingle(param, param.default)
            })
            this.saveChange(vals, validities)
        },

        validateSingle: function(param, val) {
            return param.choices ? !! val
                : ! param.validate || param.validate(val)
        },
        handleSingleChange: function(paramIndex, val, validity) {
            var vals = this.state.vals
            var validities = this.state.validities
            vals[paramIndex] = val
            validities[paramIndex] = validity
            this.saveChange(vals, validities)
        },
        saveChange: function(vals, validities) {
            var allValid = validities.every(function(validity) {
                return validity
            })
            this.setState({
                vals: vals,
                validities: validities
            })
            this.props.onChange(vals, allValid)
        },

        createInputCompo: function(param, paramIndex) {
            var self = this
            var isMult = this.nestsMulti && param.multi
            var inputClass = 
                isMult ? FormInputMulti
                : param.choices ? FormInputRadio
                : param.paramType === 'token' ? FormInputToken
                : FormInputText
            var inputCompo = React.createElement(inputClass, {
                param: param,
                val: this.state.vals[paramIndex],
                valid: this.state.validities[paramIndex],
                selToken: this.props.selToken,
                onChange: function(val, validity) {
                    // FormInputMulti will provide validity, which is
                    // calculated in its `saveChange` as `allValid`.
                    // single inputs should not provide validity.
                    if (typeof validity !== 'boolean') {
                        validity = self.validateSingle(param, val)
                    }
                    self.handleSingleChange(paramIndex, val, validity)
                },
                key: paramIndex
            })
            return isMult
                ? inputCompo
                : React.createElement("label", {className: "input-single", key: paramIndex}, 
                    React.createElement("span", null, param.label), 
                    inputCompo
                )
        }
    }
    /*
        required in props, in addition to those for formInputsMixin
            params
    */
    var FormInputs = React.createClass({displayName: "FormInputs",
        mixins: [formInputsMixin],
        nestsMulti: true,
        componentWillMount: function() {
            this.resetAll(this.props.params)
        },
        componentWillReceiveProps: function(nextProps) {
            if (this.props.params !== nextProps.params) { // obj ref equality
                this.resetAll(nextProps.params)
            }
        },
        render: function() {
            var inputCompos = this.props.params.map(this.createInputCompo)
            return React.createElement("div", null, 
                inputCompos
            )
        }
    })
    /*
        required in props, in addition to those for formInputsMixin
            param
    */
    var FormInputMulti = React.createClass({displayName: "FormInputMulti",
        mixins: [formInputsMixin],
        nestsMulti: false,
        componentWillMount: function() {
            this.resetAll([this.props.param]) // init size 1
        },
        componentWillReceiveProps: function(nextProps) {
            if (this.props.param !== nextProps.param) { // obj ref equality
                this.resetAll([nextProps.param]) // init size 1
            }
        },
        render: function() {
            var self = this
            var param = this.props.param

            function modState(fn) {
                var vals = self.state.vals
                var validities = self.state.validities
                fn(vals, validities)
                self.saveChange(vals, validities)
            }
            function handleAdd(i) {
                modState(function(vals, validities) {
                    vals.splice(i + 1, 0, param.default)
                    validities.splice(i + 1, 0, self.validateSingle(param, param.default))
                })
            }
            function handleDel(i) {
                modState(function(vals, validities) {
                    vals.splice(i, 1)
                    validities.splice(i, 1)
                })
            }

            var inputCompos = this.state.vals.map(function(val, i) {
                return React.createElement("div", {key: i}, 
                    self.createInputCompo(param, i), 
                    React.createElement("button", {type: "button", onClick: function() {
                        handleAdd(i)
                    }}, "+"), 
                    React.createElement("button", {type: "button", onClick: function() {
                        handleDel(i)
                    }}, "-")
                )
            })
            return React.createElement("div", {className: "input-multi"}, 
                React.createElement("span", null, 
                    React.createElement("span", null, param.label), 
                    React.createElement("button", {type: "button", 
                        onClick: function() {
                            handleAdd(-1)
                        }, 
                        className: "insert-head"}, "+")
                ), 
                inputCompos
            )
        }
    })

    var FormInputText = React.createClass({displayName: "FormInputText",
        handleChange: function(e) {
            this.props.onChange(e.target.value)
        },
        render: function() {
            return React.createElement("input", {type: "text", 
                value: this.props.val, 
                onChange: this.handleChange, 
                className: this.props.valid ? '' : 'error'})
        }
    })
    var FormInputRadio = React.createClass({displayName: "FormInputRadio",
        handleChange: function(e) {
            this.props.onChange(e.target.value)
        },
        render: function() {
            var self = this
            var param = this.props.param
            var name = 'pattern-editor-create-param-' + param.label
                // assume param.label is unique among the list of params
            var radios = Object.keys(param.choices).map(function(choiceLabel) {
                var choiceVal = param.choices[choiceLabel]
                return React.createElement("label", {key: choiceVal}, 
                    React.createElement("input", {type: "radio", 
                        name: name, 
                        value: choiceVal, 
                        checked: self.props.val === choiceVal, 
                        onChange: self.handleChange}), 
                    React.createElement("span", null, choiceLabel)
                )
            })
            return React.createElement("div", {className: this.props.valid ? '' : 'error'}, 
                radios
            )
        }
    })
    var FormInputToken = React.createClass({displayName: "FormInputToken",
        handlePasteCompo: function() {
            if (! this.props.selToken) {
                return
            }
            var token = _.merge({}, this.props.selToken) // important to clone!
            // TODO selecting `x` of `[^x]` and then pasting will paste `[^x]`
            this.props.onChange(token)
        },
        render: function() {
            var token = this.props.val
            var droppedCompo = token
                ? React.createElement(Cell, {token: token})
                : React.createElement("p", {className: "error"}, "Click to paste the clipboard content.")
            var className = 'droppable ' + (this.props.valid ? '' : 'error')
            return React.createElement("div", {onClick: this.handlePasteCompo, className: className}, 
                droppedCompo
            )
        }
    })

    var Palette = React.createClass({displayName: "Palette",
        render: function() {
            var self = this
            var minNumCells = 5
            var tokensInPalette = this.props.tokensInPalette
            var cells = Array.apply(null, {
                    // +1 so there is always an empty cell
                    length: Math.max(minNumCells, tokensInPalette.length + 1)
                })
                .map(function(foo, i) {
                    var deleteBtn = tokensInPalette[i]
                        ? React.createElement("button", {
                            onClick: function() {
                                self.props.onDelete(i)
                            }, 
                            className: "del"}, "X")
                        : null
                    return React.createElement("div", {className: "palette-cell", key: i}, 
                        React.createElement(Cell, {
                            token: tokensInPalette[i], 
                            onSelect: self.props.onSelect}), 
                        deleteBtn
                    )
                })
            return React.createElement("div", {className: "palette"}, 
                React.createElement("span", {className: "label"}, "Clipboard"), 
                React.createElement("div", {className: "clipboard palette-cell"}, 
                    React.createElement(Cell, {token: this.props.selToken})
                ), 
                React.createElement("div", {className: "vr"}), 
                React.createElement("span", {className: "label"}, "Palette"), 
                React.createElement("div", {className: "palette-cells"}, 
                    cells
                )
            )
        }
    })

    /*
        in props {
            token: required
            onSelect: required if selection is to be enabled.
        }
    */
    var Cell = React.createClass({displayName: "Cell",
        componentWillMount: function() {
            this.saveClonedToken(this.props.token)
        },
        componentWillReceiveProps: function(nextProps) {
            // Comparing with previous token is for more than just optimization.
            // We want to clone exactly once per token
            //     b/c selection in Cell relies on exact obj ref equality
            //     between the global selection `selToken` and Cell's token.
            //     Hence retained the cloned obj by saving it in state.
            // Selection by text range is disabled
            //     b/c there is no corresponding text.
            // TODO update documentation. state is needed or e.g. o/w:
            //     put in a spec char into set of chars -> create exclusive
            //     -> create inclusive --> the spec char in palette for prev
            //     item toggles too.
            var willCloneToken = this.props.token !== nextProps.token
            if (willCloneToken) {
                this.saveClonedToken(nextProps.token)
            }
        },
        saveClonedToken: function(token) {
            if (token) {
                token = _.merge({}, token) // important to clone!
                surfaceData.setUiData(token)
            }
            this.setState({
                token: token
            })
        },

        handleSelect: function() {
            if (this.props.onSelect) {
                this.props.onSelect(this.state.token) // state not props
            }
        },
        render: function() {
            var token = this.state.token // state not props
            return token
                ? React.createElement(reactClasses.Surface, {
                    tree: token, 
                    patternEditorMode: "select", 
                    onSelect: this.handleSelect})
                : null
        }
    })

    reactClasses.PatternEditor = PatternEditor
})(window.reactClasses = window.reactClasses || {})
;(function(reactClasses) {
    'use strict'

    var selectableMixin = {
        /*
            Relays any kind of events to the parent component. The root `Surface`
                component will eventually receive it and process it.
        */
        handleEvents: function(e) {
            var pegrexEvt
            if (e.isPegrexEvt) {
                // Then pass-thru.
                pegrexEvt = e
            } else {
                // Then `this` originated the event.
                pegrexEvt = {
                    isPegrexEvt: true,
                    data: this.props.data,
                    type: e.type
                }

                // Event can come from a click on a transparent element.
                // If so, prevent elements behind it from firing more click events.
                e.stopPropagation()
            }
            this.props.onBubbleUpEvents(pegrexEvt)
        },
        /*
            Determines if this compo is (1) selectable and (2) selected, based on
                the current mode, the current selected portion of the pattern string,
                and the span of text that this compo is associated with.
            Expresses these properties on the DOM, on this.refs.hiliteElm.
        */
        hiliteSelected: function() {
            if (! this.refs.hiliteElm || ! this.props.data.textLoc) {
                return
            }
            var mode = this.props.patternEditorMode
            var patternSel = this.props.patternSel
            var textLoc = this.props.data.textLoc
            var type = this.props.data.type

            var textHasLen = textLoc
                && textLoc[0] != textLoc[1]

            var amSelectable = {
                'select': type && type[0] <= 'Z',
                    // whether data is a parser token. Relies on the case convention.
                'add': !! textLoc,
                'delete': textHasLen
            }[mode]
            var amSelectedByTextRange = patternSel && textHasLen
                && patternSel[0] <= textLoc[0]
                && patternSel[1] >= textLoc[1]

            var hiliteElm = this.refs.hiliteElm.getDOMNode()

            // ie-safe toggle
            if (hiliteElm.classList &&
                hiliteElm.classList.contains('selectable') !== amSelectable) {
                hiliteElm.classList.toggle('selectable')
            }
            function handleEvt(elm, type, handler) {
                elm[(amSelectable ? 'add' : 'remove') + 'EventListener'](type, handler)
            }
            handleEvt(hiliteElm, 'click', this.handleEvents)
            handleEvt(hiliteElm, 'mouseenter', this.handleEvents)
            handleEvt(hiliteElm, 'mouseleave', this.handleEvents)

            // note: filter attr is not supported by react, so have to use js anyway.
            if (amSelectedByTextRange) {
                hiliteElm.setAttribute('filter', 'url(#dropshadow-sel-by-text-range)')
            } else {
                hiliteElm.removeAttribute('filter')
            }
        },

        componentDidMount: function() {
            var rootElm = this.getDOMNode()
            rootElm.setAttribute('data-type', this.props.data.type)
            this.hiliteSelected()
        },
        componentDidUpdate: function() {
            this.hiliteSelected()
        }
    }

    /*
        boxedClass's render fn reads following vals. All are optional unless noted.
        In the increasing order of z-index ...
            // for rect
            data.ui
                .pos // required
                .dim // required
                .fill // default 'white' so it can hide neighborArrows underneath
                .stroke
                .strokeW // default 3. if zero, use stroke='none'

            // for other children
            // The creation of these children components are delegated to `createNested`,
            //     so they each must have valid `.type`.
            // The separation of props is for convenience while adding ui data;
            //     render fn does not care which types of children are in which props.
            data.ui
                .fillers
                .neighborArrows
            whatever surfaceData.getChildTokens(data) reads in order to get children
            data.ui
                .textBlocks
    */
    var boxedClass = React.createClass({displayName: "boxedClass",
        mixins: [selectableMixin],
        render: function() {
            var self = this
            var data = this.props.data

            var txform = ['translate(', data.ui.pos, ')'].join('')

            var boxCompo = (
                React.createElement("rect", {width: data.ui.dim[0], height: data.ui.dim[1], rx: "3", ry: "3", 
                        stroke: data.ui.stroke, 
                        strokeWidth: data.ui.strokeW || 3, 
                        fill: data.ui.fill || 'white', 
                        ref: "hiliteElm"})
            )

            /*
                val is [
                    [children from one property]
                ]
                I think this is better for key management than having one big array?
            */
            var childCompos = [
                data.ui.fillers || [],
                data.ui.neighborArrows || [],
                surfaceData.getChildTokens(data) || [],
                data.ui.textBlocks || [],
            ].map(function(childVal) {
                var childList = ([].concat(childVal))
                    .map(function(childData, i) {
                        return createNested(self, childData, i)
                    })
                return childList
            })

            return (
                React.createElement("g", {transform: txform}, 
                    boxCompo, 
                    childCompos
                )
            )
        }
    })
    var typeToClass = {
        'Terminus': React.createClass({
            render: function() {
                var ui = this.props.data.ui

                var txform = ['translate(', ui.pos, ')'].join('')

                return (
                    React.createElement("g", {transform: txform}, 
                        React.createElement("circle", {cx: ui.cx, cy: ui.cy, r: ui.r, fill: ui.fill})
                    )
                )
            }
        }),

        /*
            below: UI-only types that do not come from parser.
            Important: hiliteSelected depends on the convention of
                starting UI-only types with lower case.
        */

        // make textBlock selectable to prevent flicker of mouse cursor
        'textBlock': React.createClass({
            mixins: [selectableMixin],
            render: function() {
                var data = this.props.data

                var txform = ['translate(', data.pos, ')'].join('')

                var textCompos = data.rows.map(function(row, i) {
                    return (
                        React.createElement("text", {x: row.anchorPos[0], y: row.anchorPos[1], textAnchor: row.anchor, 
                            fontFamily: "monospace", 
                            key: i}, 
                            row.text
                        )
                    )
                })

                return (
                    React.createElement("g", {transform: txform}, 
                        textCompos
                    )
                )
            }
        }),

        /*
            Make a path with a box around it that can be selectable.

            In addition to those required for 'path' class,
            these props are required inside this.props.data: {
                pos: [n,n]
                dim: [n,n]
            }
        */
        'boxed path': React.createClass({
            mixins: [selectableMixin],
            render: function() {
                var data = this.props.data

                var txform = ['translate(', data.pos, ')'].join('')

                var pathData = Object.create(data)
                pathData.pos = null

                return (
                    React.createElement("g", {transform: txform}, 
                        React.createElement("rect", {width: data.dim[0], height: data.dim[1], 
                            fill: "none", 
                            ref: "hiliteElm"}), 
                        React.createElement(typeToClass.path, {data: pathData})
                    )
                )
            }
        }),

        /*
            in this.props.data: {
                d: required -- array of (strings or [n,n]).
                    If using marker, last element must be [n,n], b/c it will be adjusted.
                    All coords are absolute.
                    Segments in d are connected by...
                        nothing between (* -> string)
                        quadratic bezier between (coord -> coord)
                        straight line between (string -> coord)
                pos: optional [n,n], default [0,0]
                isVertical: optional bool, default false
                usesMarkerEnd: optional bool, default true
                stroke: optional, default surfaceData.neighborArrowColor
            }
        */
        'path': React.createClass({
            render: function() {
                var data = this.props.data
                var segms = data.d
                var usesMarkerEnd = data.usesMarkerEnd !== false

                var txform = ['translate(', (data.pos || [0,0]), ')'].join('')

                var dStr = (function() {
                    if (usesMarkerEnd) {
                        ;(function() {
                            // Make adjustment for marker here, just before drawing, so that whether a marker
                            // is used at the end can be adjusted while finalizing surface data.

                            var end = segms.slice(-1)[0]
                            if (! (end instanceof Array)) {
                                console.warn('could not adjust path for marker. make sure last item is a coord.', data)
                                return
                            }
                            segms = segms.slice() // clone so marker adjustment does not survive re-rendering
                            end = end.slice()
                            segms.splice(-1, 1, end)
                            end[data.isVertical ? 1 : 0] -= surfaceData.markerLen
                        })()
                    }

                    var connected = segms.reduce(function(connected, segm, i) {
                        var next = (function() {
                            if (typeof segm === 'string') {
                                // (coord or string or beginning of array) followed by string
                                return segm
                            }
                            if (segms[i - 1] instanceof Array) {
                                // coord followed by coord
                                return surfaceData.reflectedQuadra(segms[i - 1], segm, data.isVertical)
                            }
                            if (i) {
                                // string followed by coord
                                return ['L', segm]
                            }
                            // beginning of array followed by coord
                            return ['M', segm]
                        })()
                        return connected.concat(next)
                    }, [])
                    return connected.join(' ')
                })()

                return (
                    React.createElement("g", {transform: txform}, 
                        React.createElement("path", {d: dStr, 
                            markerEnd: usesMarkerEnd ? 'url(#marker-end-arrow)' : null, 
                            stroke: data.stroke || surfaceData.neighborArrowColor, 
                            fill: "none"})
                    )
                )
            }
        })
    }

    function createNested(parentCompo, childData, key) {
        if (! parentCompo.handleEvents) {
            console.error('Cannot nest', parentCompo.props, childData)
            throw [
                'Because the parent component is not equipped to relay',
                'the chaing of bubbled up select events, the child component',
                'will not be selectable. While this is technically sensible,',
                'it is not expected in this app, so something is wired wrong.'
            ].join('')
        }
        var clazz = typeToClass[childData.type] || boxedClass
        var instance = React.createElement(clazz, {
            onBubbleUpEvents: parentCompo.handleEvents,
            data: childData,
            patternSel: parentCompo.props.patternSel,
            patternEditorMode: parentCompo.props.patternEditorMode,
            key: key
        })
        return instance
    }

    /*
        props ~= {
            tree: required
            
            onHover: optional

            patternSel // required if highlighting by text selection is to be enabled.

            // both are required iff selection is to be enabled
            patternEditorMode
            onSelect
        }
    */
    var Surface = React.createClass({displayName: "Surface",
        handleEvents: function(pegrexEvt) {
            if (pegrexEvt.type === 'click') {
                this.props.onSelect(pegrexEvt.data)
            } else {
                this.props.onHover &&
                this.props.onHover(pegrexEvt.data, pegrexEvt.type === 'mouseenter')
            }
        },
        render: function() {
            var tree = this.props.tree

            var svgDim = [0,0]
            var childCompo
            if (tree) {
                svgDim = tree.ui.surfaceDim
                childCompo = createNested(this, tree)
            }

            return (
                React.createElement("div", {className: "surface-parent"}, 
                    React.createElement("svg", {width: svgDim[0], height: svgDim[1], 
                        "data-mode": this.props.patternEditorMode, 
                        id: this.props.isMainSurface ? 'main-surface' : null}, 
                        this.props.isMainSurface ? React.createElement(SurfaceMetadata, null) : null, 
                        childCompo
                    )
                )
            )
        }
    })

    var SurfaceMetadata = React.createClass({displayName: "SurfaceMetadata",
        render: function() {
            var markerEndArrow = '\
                <marker id="marker-end-arrow" \
                    viewBox="0 0 10 10" refX="0" refY="5" markerWidth="{0}" markerHeight="{0}" orient="auto" fill="{1}"> \
                    <path d="M 0 0 L 10 5 L 0 10 z" /> \
                </marker>'
                    .replace(/\{0\}/g, surfaceData.markerLen)
                    .replace(/\{1\}/g, surfaceData.neighborArrowColor)
            
            var dropShadowTemplate = '\
                <filter id="{0}" height="180%" width="180%"> \
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/> \
                    <feOffset dx="2" dy="2" result="offsetblur"/> \
                    <feFlood flood-color="{1}"/> \
                    <feComposite in2="offsetblur" operator="in"/> \
                    <feMerge> \
                        <feMergeNode/> \
                        <feMergeNode in="SourceGraphic"/> \
                    </feMerge> \
                </filter>'
            var dropShadowSelByTextRange = dropShadowTemplate
                .replace(/\{0\}/g, 'dropshadow-sel-by-text-range')
                .replace(/\{1\}/g, 'red')
            return (
                React.createElement("defs", {dangerouslySetInnerHTML: {
                    __html: markerEndArrow + dropShadowSelByTextRange
                }})
            )
        }
    })

    reactClasses.Surface = Surface
})(window.reactClasses = window.reactClasses || {})
;(function(reactClasses) {
    'use strict'

    var Texts = React.createClass({displayName: "Texts",
        render: function() {
            return (
                React.createElement("div", {className: "texts-parent"}, 
                    React.createElement(Literal, {
                        pattern: this.props.pattern, 
                        flags: this.props.flags, 
                        isPatternValid: this.props.isPatternValid, 
                        isFlagsValid: this.props.isFlagsValid, 
                        patternSel: this.props.patternSel, 
                        onChange: this.props.onChange, 
                        onSelect: this.props.onPatternSelect}), 
                    React.createElement("hr", null), 
                    React.createElement(Ctor, {
                        pattern: this.props.pattern, 
                        flags: this.props.flags, 
                        isPatternValid: this.props.isPatternValid, 
                        isFlagsValid: this.props.isFlagsValid, 
                        onChange: this.props.onChange})
                )
            )
        }
    })

    function getRefVals(refs) {
        return Object.keys(refs).reduce(function(map, refName) {
            map[refName] = refs[refName].getDOMNode().value
            return map
        }, {})
    }
    var Literal = React.createClass({displayName: "Literal",
        componentWillReceiveProps: function(nextProps) {
            var input
            if (nextProps.patternSel) {
                input = this.refs.pattern.getDOMNode()
                input.setSelectionRange.apply(input, nextProps.patternSel)
            }
        },
        handleChange: function() {
            var parts = getRefVals(this.refs)
            this.props.onChange(parts)
        },
        handleSelect: function(e) {
            // note: chrome doesn't remember which direction a mouse selected -> always 'none'
            //     also, 1. select fwd using keyboard 2. select to home (shift+home or cmd+shift+left)
            //         --> seln is not anchored on original point.

            // info: if blur was for clicking on svg, blur fires before re-focus, so it works

            // need to handle blur b/c otherwise infinite loop
            var elm = e.target
            var patternSel = e.type === 'blur'
                ? null
                : [elm.selectionStart, elm.selectionEnd, elm.selectionDirection]
            this.props.onSelect(patternSel)
        },
        render: function() {
            function className(propName, valid) {
                return propName + (valid ? '' : ' error')
            }
            var classNames = {
                pattern: className('pattern', this.props.isPatternValid),
                flags: className('flags', this.props.isFlagsValid)
            }

            return (
                React.createElement("fieldset", {className: "literal"}, 
                    React.createElement("span", {className: "prefix"}, "/"), 
                    React.createElement("input", {type: "text", ref: "pattern", 
                        placeholder: 'For an empty match, use (?:)', 
                        value: this.props.pattern, 
                        onChange: this.handleChange, 
                        onSelect: this.handleSelect, 
                        className: classNames.pattern}), 
                    React.createElement("span", {className: "infix"}, "/"), 
                    React.createElement("input", {type: "text", ref: "flags", 
                        value: this.props.flags, 
                        onChange: this.handleChange, 
                        className: classNames.flags}), 
                    React.createElement("span", {className: "suffix"})
                )
            )
        }
    })
    var Ctor = React.createClass({displayName: "Ctor",
        /*
            In simple conditions, we can let react loop back our updates.
            
            E.g. a val in DOM is changed to `a\\`
                -> update parent component that val has changed to the unescaped val of `a\`
                -> looped back render fn sees that val (in this.props) is `a\`
                -> escape, then set DOM val to `a\\`
                -> what you type is what you get
            
            But in many conditions, the escaped and unescaped vals are not inverses of each other.
            
            E.g. val in DOM is `a\`
                B/c this val is invalid, we want to update the parent component that the
                    escaped value is blank (and we want the graphical represenation to be blank).
                    But then loop back will override the DOM val with blank; making it
                    impossible to type a `\`.
                Even if we wanted to update not with blank but with a hacked unescaped val that
                    escapes back to the original `a\`, such a val does not exist.
            
            Solution:
            On change, save the current escaped part (this.state.escParts),
                and the converted unescaped part (this.state.prevParts).
            On render, compare the saved escaped part against the received part.
                If they're different, then use the received part. It can be assumed
                    that the received part came from some mechanism besides loop back (e.g. hash).
                If they're the same, then use the saved escaped part.
        */
        getInitialState: function() {
            return {
                prevParts: {},
                escParts: {},
                escValidParts: {}
            }
        },

        escape: function(part) {
            return part.replace(/\\/g, '\\\\')
        },
        getUnescapedParts: function(escParts) {
            function unescape(str) {
                // TODO test

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
            var escValidParts = {
                pattern: parts.pattern != null,
                flags: parts.flags != null
            }
            var prevParts = {}
            prevParts.pattern = parts.pattern = parts.pattern || ''
            prevParts.flags = parts.flags = parts.flags || ''
            this.setState({
                prevParts: prevParts,
                escParts: escParts,
                escValidParts: escValidParts
            })
            this.props.onChange(parts)
        },
        render: function() {
            var self = this

            var valids = {
                pattern: this.props.isPatternValid,
                flags: this.props.isFlagsValid
            }

            var escParts = {}, classNames = {}
            ;['pattern', 'flags'].forEach(function(partName) {
                if (self.state.prevParts[partName] === self.props[partName]) {
                    escParts[partName] = self.state.escParts[partName]
                    valids[partName] = valids[partName]
                        && self.state.escValidParts[partName]
                } else {
                    escParts[partName] = self.escape(self.props[partName])
                }

                classNames[partName] = partName + (valids[partName] ? '' : ' error')
            })

            return (
                React.createElement("fieldset", {className: "ctor"}, 
                    React.createElement("span", {className: "prefix"}, "new RegExp('"), 
                    React.createElement("input", {type: "text", ref: "pattern", 
                        value: escParts.pattern, 
                        onChange: this.handleChange, 
                        className: classNames.pattern}), 
                    React.createElement("span", {className: "infix"}, "','"), 
                    React.createElement("input", {type: "text", ref: "flags", 
                        value: escParts.flags, 
                        onChange: this.handleChange, 
                        className: classNames.flags}), 
                    React.createElement("span", {className: "suffix"}, "')")
                )
            )
        }
    })

    reactClasses.Texts = Texts
})(window.reactClasses = window.reactClasses || {})
;(function(reactClasses) {
    'use strict'

    reactClasses.hashUtil = {
        read: function() {
            // ff decodes location.hash
            return decodeURIComponent(window.location.href.split("#")[1])
        },
        parse: function() {
            var hash = reactClasses.hashUtil.read()
            var commaIndex = hash.indexOf(',')
            if (commaIndex <= 0) { return }
            var patternLen = Number(hash.slice(0, commaIndex))
            if (isNaN(patternLen)) { return }
            var flagsIndex = commaIndex + 1 + patternLen
            return {
                pattern: hash.slice(commaIndex + 1, flagsIndex),
                flags: hash.slice(flagsIndex)
            }
        },
        update: function(parts, rememberPrev) {
            var hash = parts.pattern.length + ','
                + parts.pattern + parts.flags
            if (hash === reactClasses.hashUtil.read()) {
                return
            }
            if (rememberPrev) {
                window.location.hash = encodeURIComponent(hash)
            } else {
                window.location.replace('#' + encodeURIComponent(hash))
            }
        }
    }

    reactClasses.ls = {
        readBool: function(key, def) {
            var val = localStorage.getItem(key)
            return val
                ? val !== 'false'
                : def
        }
    }

})(window.reactClasses = window.reactClasses || {})
React.render(
    React.createElement(reactClasses.Controls, null),
    document.getElementsByClassName('react-parent')[0]
)
