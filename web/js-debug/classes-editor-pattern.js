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

    var PatternEditor = React.createClass({
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
                <div className="pattern-editor-parent"
                    data-hidden={this.state.hidden ? '' : null}
                    data-pinned={this.state.pinned ? '' : null}>
                    <div className="pattern-editor-toggler-parent">
                        <button
                            onClick={this.handleTogglePin}
                            className="pattern-editor-pinner" />
                        <button
                            onClick={this.handleToggleShow}
                            className="pattern-editor-toggler" />
                    </div>
                    <div className="pattern-editor">
                        <Palette
                            tokensInPalette={this.state.tokensInPalette}
                            selToken={this.props.selToken}
                            onSelect={this.props.onSelect}
                            onDelete={this.handleDeleteFromPalette} />
                        <div className="create-parent">
                            <FormChooser
                                onChange={this.handleChangeTokenLabel} />
                            <Form
                                tokenLabel={this.state.tokenLabel}
                                selToken={this.props.selToken}
                                onSubmit={this.handleCreate} />
                        </div>
                    </div>
                </div>
            )
        }
    })
    var FormChooser = React.createClass({
        shouldComponentUpdate: function() {
            return false
        },
        handleChangeTokenLabel: function(e) {
            this.props.onChange(e.target.value)
        },
        render: function() {
            var self = this
            var createOptions = tokenCreator.tokenLabels.map(function(tokenLabel) {
                return <label key={tokenLabel}>
                    <input type="radio" name="palette-editor-create-type"
                        value={tokenLabel}
                        onChange={self.handleChangeTokenLabel} />
                    <span>{tokenLabel}</span>
                </label>
            })
            return <fieldset className="create-type-chooser">
                <legend>Create</legend>
                {createOptions}
            </fieldset>
        }
    })

    var Form = React.createClass({
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
                <form onSubmit={this.handleSubmit}
                    className="create-form">
                    <div className="create-form-inputs">
                        <FormInputs
                            params={this.state.params}
                            selToken={this.props.selToken}
                            onChange={this.handleChange} />
                        <input type="submit" value="Create"
                            disabled={! this.state.previewToken} />
                        <p ref="overallError" className="error">
                            {this.state.previewErrMsg}</p>
                    </div>
                    <div className="create-form-preview">
                        <p>Preview</p>
                        <p className="preview-str">{this.state.previewStr}</p>
                        <Cell token={this.state.previewToken} />
                    </div>
                </form>
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
                : <label className="input-single" key={paramIndex}>
                    <span>{param.label}</span>
                    {inputCompo}
                </label>
        }
    }
    /*
        required in props, in addition to those for formInputsMixin
            params
    */
    var FormInputs = React.createClass({
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
            return <div>
                {inputCompos}
            </div>
        }
    })
    /*
        required in props, in addition to those for formInputsMixin
            param
    */
    var FormInputMulti = React.createClass({
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
                return <div key={i}>
                    {self.createInputCompo(param, i)}
                    <button type="button" onClick={function() {
                        handleAdd(i)
                    }}>+</button>
                    <button type="button" onClick={function() {
                        handleDel(i)
                    }}>-</button>
                </div>
            })
            return <div className="input-multi">
                <span>
                    <span>{param.label}</span>
                    <button type="button"
                        onClick={function() {
                            handleAdd(-1)
                        }}
                        className="insert-head">+</button>
                </span>
                {inputCompos}
            </div>
        }
    })

    var FormInputText = React.createClass({
        handleChange: function(e) {
            this.props.onChange(e.target.value)
        },
        render: function() {
            return <input type="text"
                value={this.props.val}
                onChange={this.handleChange}
                className={this.props.valid ? '' : 'error'} />
        }
    })
    var FormInputRadio = React.createClass({
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
                return <label key={choiceVal}>
                    <input type="radio"
                        name={name}
                        value={choiceVal}
                        checked={self.props.val === choiceVal}
                        onChange={self.handleChange} />
                    <span>{choiceLabel}</span>
                </label>
            })
            return <div className={this.props.valid ? '' : 'error'}>
                {radios}
            </div>
        }
    })
    var FormInputToken = React.createClass({
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
                ? <Cell token={token} />
                : <p className="error">Click to paste the clipboard content.</p>
            var className = 'droppable ' + (this.props.valid ? '' : 'error')
            return <div onClick={this.handlePasteCompo} className={className}>
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
                    var deleteBtn = tokensInPalette[i]
                        ? <button
                            onClick={function() {
                                self.props.onDelete(i)
                            }}
                            className="del">X</button>
                        : null
                    return <div className="palette-cell" key={i}>
                        <Cell
                            token={tokensInPalette[i]}
                            selToken={self.props.selToken}
                            onSelect={self.props.onSelect} />
                        {deleteBtn}
                    </div>
                })
            return <div className="palette">
                <span className="label">Clipboard</span>
                <div className="clipboard palette-cell">
                    <Cell token={this.props.selToken} />
                </div>
                <div className="vr" />
                <span className="label">Palette</span>
                <div className="palette-cells">
                    {cells}
                </div>
            </div>
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
    var Cell = React.createClass({
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
                ? <reactClasses.Surface
                    tree={token}
                    onSelect={this.handleSelect}
                    onHover={function() {}}
                    patternSel={[0,0]} // disable sel by text range
                    selToken={this.props.selToken} // enable sel by exact match
                    patternEditorMode="select" />
                : null
        }
    })

    reactClasses.PatternEditor = PatternEditor
})(window.reactClasses = window.reactClasses || {})
