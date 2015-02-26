;(function(reactClasses) {
    'use strict'

    /*
    Important!! : Tokens that are stored in a state are there to be shared
        with many react components. When multiple components read the same
        token and want to render different Surfaces from it, the tokens
        must have different `.ui` assigned. To prevent the sharing of UI
        data (e.g. pos and surfaceDim), tokens must be always cloned before
        being rendered by the Surface class.
    While soft cloning with Object.create is ok if only using `setUiData`
        (where only `.ui` is assigned), a token is expected to have its
        non-ui properties modified when embedded within another token.
        Therefore, deep cloning with _.merge is the safe choice.
    E.g. when a `Specific Char` is embedded in a `Range of Chars` which is
        embedded in an exclusive `Set of Chars`, `Specific Char`'s
        `.inclusive` is toggled, contaminating the original token if 
        the embedded token was soft cloned.

    The states in question are (in the chronological order of population)
        previewToken, tokensInPalette[i], selToken
    The operations in question are
        Cell draws tokens from any of the above 3 sources, and adds `.ui` in the process.
        FormFieldDroppable uses selToken to create previewToken.
            In other words, previewToken embeds selToken.
    */

    var PatternEditor = React.createClass({
        getInitialState: function() {
            return {
                tokenLabel: null,
                tokensInPalette: []
            }
        },
        handleChangeTokenLabel: function(e) {
            this.setState({
                tokenLabel: e.target.value
            })
        },
        handleCreate: function(token) {
            this.setState({
                tokensInPalette: this.state.tokensInPalette.concat(token)
            })
        },
        handlePaletteDelete: function(index) {
            this.state.tokensInPalette.splice(index, 1)
            this.setState({
                tokensInPalette: this.state.tokensInPalette
            })
            this.props.onSelect(null)
        },
        render: function() {
            var self = this
            var createOptions = tokenCreator.tokenLabels.map(function(tokenLabel) {
                return (
                    <label key={tokenLabel}>
                        <input type="radio" name="palette-editor-create-type"
                            value={tokenLabel}
                            onChange={self.handleChangeTokenLabel} />
                        <span>{tokenLabel}</span>
                    </label>
                )
            })
            return (
                <div className="pattern-editor">
                    <Palette
                        tokensInPalette={this.state.tokensInPalette}
                        selToken={this.props.selToken}
                        onSelect={this.props.onSelect}
                        onDelete={this.handlePaletteDelete} />
                    <div className="create-parent">
                        <fieldset className="create-type">
                            <legend>Create</legend>
                            {createOptions}
                        </fieldset>
                        <Form
                            tokenLabel={this.state.tokenLabel}
                            selToken={this.props.selToken}
                            onSubmit={this.handleCreate} />
                    </div>
                </div>
            )
        }
    })

    var Form = React.createClass({
        /* props of state:
            params, allValid, validities, vals, previewToken, overallErrorMsg */
        getInitialState: function() {
            return {
                params: [],
            }
        },
        componentWillReceiveProps: function(nextProps) {
            if (this.props.tokenLabel === nextProps.tokenLabel) {
                return
            }
            // reset state to a clean slate for the tokenLabel
            var params = tokenCreator.getParams(nextProps.tokenLabel)
            this.compileVals(nextProps.tokenLabel, {
                params: params,
                validities: params.map(function() {
                    return false
                }), // make dense array so allValid can be correctly derived.
                vals: [] // sparse array
            })
        },

        compileVals: function(tokenLabel, newState) {
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

        validateSingle: function(fieldProps, elm) {
            var isValid = fieldProps.param.choices
                // TODO make sure validation is happening on change tokenLabel.
                // e.g. pick Set of Chars -> first radio has default hence valid -> pick Word Boundary -> wrongly shows as valid
                // ? Object.keys(fieldProps.param.choices).some(function(choiceLabel) {
                //     var choiceVal = fieldProps.param.choices[choiceLabel]
                //     return elm.value === choiceVal
                // })
                ? !! elm.value // assuming we don't have a value that is ''
                : ( ! fieldProps.param.validate
                    || fieldProps.param.validate(elm.value) )
            elm.classList.toggle('error', ! isValid)
                // note: ie does not read second arg as a flag
            return isValid
        },
        handleSingleChange: function(fieldProps, elm) {
            var isValid = this.validateSingle(fieldProps, elm)
            this.state.validities[fieldProps.paramIndex] = isValid
            this.state.vals[fieldProps.paramIndex] = elm.value
            this.compileVals(this.props.tokenLabel, this.state)
        },
        handleMultChange: function(paramIndex, singleVals, isValid) {
            this.state.validities[paramIndex] = isValid
            this.state.vals[paramIndex] = singleVals
            this.compileVals(this.props.tokenLabel, this.state)
        },
        handleSubmit: function(e) {
            e.preventDefault()
            this.props.onSubmit(this.state.previewToken)
        },

        render: function() {
            var self = this
            var fieldCompos = this.state.params &&
                this.state.params.map(function(param, i) {
                    var fieldClass = param.choices ? FormFieldRadio
                        : param.paramType === 'token' ? FormFieldDroppable
                        : FormFieldText
                    var fieldPropsProto = {
                        param: param,
                        selToken: self.props.selToken,
                        paramIndex: i
                    }
                    var fieldPropValDefault = param.default

                    /* required in props: val, onChange */
                    function getSingleFieldCompo(props) {
                        Object.keys(fieldPropsProto).forEach(function(key) {
                            props[key] = fieldPropsProto[key]
                        })
                        if (props.val == null) {
                            // do not replace if val is ''. otherwise user can never clear input
                            props.val = fieldPropValDefault
                        }
                        return React.createElement(fieldClass, props)
                    }

                    var fieldCompo = param.mult
                        ? <FormFieldMult
                            getSingleFieldCompo={getSingleFieldCompo}
                            validateSingle={self.validateSingle}
                            onMultChange={self.handleMultChange}
                            paramIndex={i} />
                        : getSingleFieldCompo({
                            val: self.state.vals[i],
                            onChange: self.handleSingleChange,
                            key: i
                        })
                    return <label key={i}>
                        <span>{param.label}</span>
                        {fieldCompo}
                    </label>
                })
            var previewStr = this.state.previewToken &&
                tokenCreator.toString(this.state.previewToken)
            return (
                <form onSubmit={this.handleSubmit}
                    className="create-form">
                    <div className="create-form-inputs">
                        {fieldCompos}
                        <input type="submit" value="Create"
                            disabled={! this.state.previewToken} />
                        <p ref="overallError" className="error">
                            {this.state.overallErrorMsg}</p>
                    </div>
                    <div className="create-form-preview">
                        <p>Preview</p>
                        <p className="preview-str">{previewStr}</p>
                        <Cell token={this.state.previewToken} />
                    </div>
                </form>
            )
        }
    })
    var FormFieldMult = React.createClass({
        getInitialState: function() {
            return this.getResetState()
        },
        componentWillReceiveProps: function(nextProps) {
            if (this.props.param !== nextProps.param) {
                this.setState(this.getResetState())
            }
        },
        getResetState: function() {
            return {
                singleVals: [null], // size is 1. val null is not significant.
                    // elm should prob be the default val, but not an issue for now
                    // b/c only mult are droppables, and they don't have defaults.
                singleValidities: [false], // is false ok as the default?
                allValid: false
            }
        },

        validateAll: function() {
            var allValid = this.state.singleValidities.every(function(validity) {
                return validity
            })
            this.setState({
                singleVals: this.state.singleVals,
                singleValidities: this.state.singleValidities,
                allValid: allValid
            })
            this.props.onMultChange(this.props.paramIndex,
                this.state.singleVals, allValid)
        },
        handleSingleChange: function(fieldProps, input) {
            var isValid = this.props.validateSingle(fieldProps, input)
            this.state.singleVals[fieldProps.multIndex] = input.value
            this.state.singleValidities[fieldProps.multIndex] = isValid
            this.validateAll()
        },
        handleAddMult: function() {
            this.state.singleVals.push(null)
            this.state.singleValidities.push(false)
            this.validateAll()
        },
        handleDelMult: function(multIndex) {
            this.state.singleVals.splice(multIndex, 1)
            this.state.singleValidities.splice(multIndex, 1)
            this.validateAll()
        },

        render: function() {
            var self = this
            var singleFieldCompos = this.state.singleVals.map(function(singleVal, i) {
                var singleFieldCompo = self.props.getSingleFieldCompo({
                    val: singleVal,
                    onChange: self.handleSingleChange,
                    multIndex: i
                })
                var handleDelMult = function() {
                    self.handleDelMult(i)
                }
                return <span key={i}>
                    {singleFieldCompo}
                    <div className="mult" onClick={handleDelMult}>-</div>
                </span>
            })
            return <div>
                <div className="mult" onClick={this.handleAddMult}>+</div>
                {singleFieldCompos}
            </div>
            // for +/-, mock a button b/c a <botton> or <button type="button">
            //     would be associated with its parent <label>
        }
    })
    var FormFieldText = React.createClass({
        componentDidMount: function() {
            this.handleChange()
        },
        handleChange: function() {
            this.props.onChange(this.props, this.getDOMNode())
        },
        render: function() {
            return <input type="text"
                value={this.props.val}
                onChange={this.handleChange} />
        }
    })
    var FormFieldRadio = React.createClass({
        // to work with validation, using `value` prop on non-input elm
        componentDidMount: function() {
            var div = this.getDOMNode()
            // assuming default to be one of the choice vals and hence valid
            div.value = this.props.param.default
            this.props.onChange(this.props, div)
        },
        handleChange: function(e) {
            var div = this.getDOMNode()
            div.value = e.target.value
            this.props.onChange(this.props, div)
        },
        render: function() {
            var self = this
            var choices = this.props.param.choices
            var radios = Object.keys(choices).map(function(choiceLabel) {
                var choiceVal = choices[choiceLabel]
                return <label key={choiceVal}>
                    <input type="radio"
                        name={'pattern-editor-create-param-' + self.props.paramIndex}
                        value={choiceVal}
                        checked={self.props.val === choiceVal}
                        onChange={self.handleChange} />
                    <span>{choiceLabel}</span>
                </label>
            })
            return <div>
                {radios}
            </div>
        }
    })
    var FormFieldDroppable = React.createClass({
        // to work with validation, using `value` prop on non-input elm
        handlePasteCompo: function(e) {
            if (! this.props.selToken) {
                return
            }
            var div = e.target
            // important to clone! do not let token creator later modify
            //     the shared token selToken
            div.value = _.merge({}, this.props.selToken)
            this.props.onChange(this.props, div)
        },
        render: function() {
            var token = this.props.val
            var droppedCompo = token
                ? <Cell token={token} />
                : <p className="error">Click on palette to copy; click here to paste.</p>
            return <div onClick={this.handlePasteCompo}
                className="droppable">
                {droppedCompo}
            </div>
        }
    })

    var Palette = React.createClass({
        render: function() {
            var self = this
            var minNumCells = 5
            var tokensInPalette = this.props.tokensInPalette
            var cells = Array.apply(null, {
                    // +1 so there is always an empty cell
                    length: Math.max(minNumCells, tokensInPalette.length + 1)
                })
                .map(function(foo, i) {
                    return <Cell
                        token={tokensInPalette[i]}
                        selToken={self.props.selToken}
                        onSelect={self.props.onSelect}
                        onDelete={self.props.onDelete}
                        cellIndex={i} key={i} />
                })
            return <div className="palette">
                {cells}
            </div>
        }
    })

    /*
        in props {
            token: required

            // both of these 2 are required for Cell to be selectable.
            // selection by text range is disabled (there is no corresponding text)
            // selToken can be falsy, as it often will be.
            onSelect
            selToken

            // both of these 2 are required for Cell to be deletable.
            cellIndex
            onDelete
        }
    */
    var Cell = React.createClass({
        componentWillMount: function() {
            this.saveClonedToken(this.props.token)
        },
        componentWillReceiveProps: function(nextProps) {
            // Comparing with previous token is for more than just optimization.
            // We do not want to unneceesary clone token b/c
            //     selection in Cell relies on exact obj ref equality
            //     between selToken and Cell's token
            // When selected, selToken will be the cloned obj. Therefore
            //     we have to retain the exact clone obj. Save it in state.
            var willCloneToken = this.props.token !== nextProps.token
            if (willCloneToken) {
                this.saveClonedToken(nextProps.token)
            }
        },
        saveClonedToken: function(token) {
            if (token) {
                token = _.merge({}, token)
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
        handleDelete: function() {
            if (this.props.onDelete) {
                this.props.onDelete(this.props.cellIndex)
            }
        },
        render: function() {
            var token = this.state.token // state not props
            var deleteBtn = this.props.onDelete
                ? <button onClick={this.handleDelete} className="del">X</button>
                : null
            return token
                ? <div className="pelette-cell">
                    <reactClasses.Surface
                        tree={token}
                        onSelect={this.handleSelect}
                        patternSel={[0,0]} // disable sel by text range
                        selToken={this.props.selToken} // enable sel by exact
                        patternEditorMode="select" />
                    {deleteBtn}
                </div>
                : <div className="empty-surface" />
        }
    })

    reactClasses.PatternEditor = PatternEditor
})(window.reactClasses = window.reactClasses || {})
