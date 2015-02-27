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
                hidden: false,
                pinned: true
            }
        },
        handleTogglePin: function() {
            this.setState({
                pinned: ! this.state.pinned
            })
        },
        handleToggleShow: function() {
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
        /* states:
            params, vals, validities, allValid, previewToken, overallErrorMsg */
        getInitialState: function() {
            return {
                params: []
            }
        },
        componentWillReceiveProps: function(nextProps) {
            if (this.props.tokenLabel === nextProps.tokenLabel) {
                return
            }
            var self = this
            // reset state to a clean slate for the tokenLabel
            var params = tokenCreator.getParams(nextProps.tokenLabel)
            this.validateAll(nextProps.tokenLabel, {
                params: params,
                vals: params.map(function(param) {
                    return param.default
                }),
                validities: params.map(function(param) {
                    return self.validateSingle(param, param.default)
                })
            })
        },

        validateAll: function(tokenLabel, newState) {
            newState.allValid = newState.validities.every(function(validity) {
                return validity
            })
            var token = newState.allValid
                ? tokenCreator.create(tokenLabel, newState.vals)
                : null
            if (token instanceof Error) {
                newState.previewToken = null
                newState.overallErrorMsg = token.message
                    || 'The inputs are not valid as a whole.'
            } else {
                newState.previewToken = token
                newState.overallErrorMsg = null
            }
            this.setState(newState)
        },
        validateSingle: function(param, val) {
            return param.choices
                ? !! val // skipping check on if it's a valid val.
                    // we don't have falsy i.e. empty val as a choice.
                : ! param.validate || param.validate(val)
        },
        handleChangeSingle: function(paramIndex, val, param) {
            this.state.vals[paramIndex] = val
            this.state.validities[paramIndex] = this.validateSingle(param, val)
            this.validateAll(this.props.tokenLabel, this.state)
        },
        handleChangeMult: function(paramIndex, val, isValid) {
            this.state.vals[paramIndex] = val
            this.state.validities[paramIndex] = isValid
            this.validateAll(this.props.tokenLabel, this.state)
        },

        handleSubmit: function(e) {
            e.preventDefault()
            this.props.onSubmit(this.state.previewToken)
        },

        render: function() {
            var self = this
            var fieldCompos = this.state.params.map(function(param, i) {
                var fieldClass = param.choices ? FormInputRadio
                    : param.paramType === 'token' ? FormInputToken
                    : FormInputText
                var fieldPropsProto = {
                    param: param,
                    selToken: self.props.selToken
                }

                /* required in props: val, valid, onChange */
                function getSingleInputCompo(props) {
                    Object.keys(fieldPropsProto).forEach(function(key) {
                        props[key] = fieldPropsProto[key]
                    })
                    return React.createElement(fieldClass, props)
                }

                var fieldCompo = param.mult
                    ? React.createElement(FormInputMult, {
                        param: param, 
                        getSingleInputCompo: getSingleInputCompo, 
                        validateSingle: self.validateSingle, 
                        onChange: function(val, isValid) {
                            self.handleChangeMult(i, val, isValid)
                        }})
                    : getSingleInputCompo({
                        val: self.state.vals[i],
                        valid: self.state.validities[i],
                        onChange: function(val) {
                            self.handleChangeSingle(i, val, param)
                        }
                    })
                return React.createElement("label", {key: i}, 
                    React.createElement("span", null, param.label), 
                    fieldCompo
                )
            })

            var previewStr = this.state.previewToken &&
                tokenCreator.toString(this.state.previewToken)
            return (
                React.createElement("form", {onSubmit: this.handleSubmit, 
                    className: "create-form"}, 
                    React.createElement("div", {className: "create-form-inputs"}, 
                        fieldCompos, 
                        React.createElement("input", {type: "submit", value: "Create", 
                            disabled: ! this.state.previewToken}), 
                        React.createElement("p", {ref: "overallError", className: "error"}, 
                            this.state.overallErrorMsg)
                    ), 
                    React.createElement("div", {className: "create-form-preview"}, 
                        React.createElement("p", null, "Preview"), 
                        React.createElement("p", {className: "preview-str"}, previewStr), 
                        React.createElement(Cell, {token: this.state.previewToken})
                    )
                )
            )
        }
    })
    var FormInputMult = React.createClass({displayName: "FormInputMult",
        /* states: vals, validities */
        getInitialState: function() {
            return this.getResetState()
        },
        componentWillReceiveProps: function(nextProps) {
            if (this.props.param !== nextProps.param) {
                this.setState(this.getResetState())
            }
        },
        getResetState: function() {
            var param = this.props.param
            return {
                // init size 1
                vals: [param.default],
                validities: [this.validateSingle(param.default)],
            }
        },

        validateAll: function() {
            var allValid = this.state.validities.every(function(validity) {
                return validity
            })
            this.setState({
                vals: this.state.vals,
                validities: this.state.validities
            })
            this.props.onChange(this.state.vals, allValid)
        },
        validateSingle: function(val) {
            var param = this.props.param
            return this.props.validateSingle(param, val)
        },
        handleChange: function(multIndex, val) {
            this.state.vals[multIndex] = val
            this.state.validities[multIndex] = this.validateSingle(val)
            this.validateAll()
        },

        handleAddMult: function() {
            var param = this.props.param
            this.state.vals.push(param.default)
            this.state.validities.push(this.validateSingle(param.default))
            this.validateAll()
        },
        handleDelMult: function(multIndex) {
            this.state.vals.splice(multIndex, 1)
            this.state.validities.splice(multIndex, 1)
            this.validateAll()
        },

        render: function() {
            var self = this
            var singleInputCompos = this.state.vals.map(function(singleVal, i) {
                var singleInputCompo = self.props.getSingleInputCompo({
                    val: singleVal,
                    valid: self.state.validities[i],
                    onChange: function(val) {
                        self.handleChange(i, val)
                    }
                })
                var handleDelMult = function() {
                    self.handleDelMult(i)
                }
                return React.createElement("span", {key: i}, 
                    singleInputCompo, 
                    React.createElement("div", {className: "mult", onClick: handleDelMult, role: "button"}, "-")
                )
            })
            return React.createElement("div", null, 
                React.createElement("div", {className: "mult", onClick: this.handleAddMult, role: "button"}, "+"), 
                singleInputCompos
            )
            // for +/-, mock a button b/c a <botton> or <button type="button">
            //     would be associated with its parent <label>
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
            // note, selecting `x` of `[^x]` and then pasting will paste `[^x]`
            this.props.onChange(token)
        },
        render: function() {
            var token = this.props.val
            var droppedCompo = token
                ? React.createElement(Cell, {token: token})
                : React.createElement("p", {className: "error"}, "Select a node to highlight it; then click here to paste.")
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
                    return React.createElement("div", {className: "pelette-cell", key: i}, 
                        React.createElement(Cell, {
                            token: tokensInPalette[i], 
                            selToken: self.props.selToken, 
                            onSelect: self.props.onSelect}), 
                        deleteBtn
                    )
                })
            return React.createElement("div", {className: "palette"}, 
                cells
            )
        }
    })

    /*
        in props {
            token: required

            // both of these 2 are required for Cell to be selectable.
            // selToken can be falsy, as it often will be.
            onSelect
            selToken
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
                    onSelect: this.handleSelect, 
                    onHover: function() {}, 
                    patternSel: [0,0], // disable sel by text range
                    selToken: this.props.selToken, // enable sel by exact match
                    patternEditorMode: "select"})
                : null
        }
    })

    reactClasses.PatternEditor = PatternEditor
})(window.reactClasses = window.reactClasses || {})
