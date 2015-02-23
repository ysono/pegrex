;(function(reactClasses) {
    'use strict'

    var PatternEditor = React.createClass({
        getInitialState: function() {
            return {
                tokenLabel: null,
                datasInPalette: [], // bad latin but w/e
                selData: null
            }
        },
        handleChangeTokenLabel: function(e) {
            this.setState({
                tokenLabel: e.target.value
            })
        },
        handleCreate: function(data) {
            this.setState({
                datasInPalette: this.state.datasInPalette.concat(data)
            })
        },
        handlePaletteSelect: function(selData) {
            this.setState({
                selData: selData
            })
            var selText = tokenCreator.toString(selData)
            this.props.onSelect(selText)
        },
        handlePaletteDelete: function(index) {
            this.state.datasInPalette.splice(index, 1)
            this.setState({
                datasInPalette: this.state.datasInPalette
            })
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
                        datasInPalette={this.state.datasInPalette}
                        onSelect={this.handlePaletteSelect}
                        onDelete={this.handlePaletteDelete} />
                    <div className="create-parent">
                        <fieldset className="create-type">
                            <legend>Create</legend>
                            {createOptions}
                        </fieldset>
                        <Form
                            tokenLabel={this.state.tokenLabel}
                            selData={this.state.selData}
                            onSubmit={this.handleCreate} />
                    </div>
                </div>
            )
        }
    })

    var Form = React.createClass({
        /* props of state:
            params, allValid, validities, vals, previewData, overallErrorMsg */
        getInitialState: function() {
            return this.tokenLabelToInitState(this.props.tokenLabel)
        },
        componentWillReceiveProps: function(nextProps) {
            if (this.props.tokenLabel !== nextProps.tokenLabel) {
                this.setState(
                    this.tokenLabelToInitState(nextProps.tokenLabel))
            }
        },

        valsToPreviewData: function(tokenLabel, state) {
            var data = state.allValid
                ? tokenCreator.create(tokenLabel, state.vals)
                : null
            if (data instanceof Error) {
                state.previewData = null
                state.overallErrorMsg = data.message
                    || 'The inputs are not valid as a whole.'
            } else {
                state.previewData = data
                state.overallErrorMsg = null
            }
            return state
        },
        tokenLabelToInitState: function(tokenLabel) {
            if (! tokenLabel) {
                return {
                    allValid: false
                }
            }
            var params = tokenCreator.getParams(tokenLabel)
            return this.valsToPreviewData(tokenLabel, {
                params: params,
                allValid: ! params.length,
                validities: params.map(function() {
                    return false
                }),
                vals: []
            })
        },

        handleChange: function(paramIndex, isValid, val) {
            var validities = this.state.validities
            var vals = this.state.vals
            validities[paramIndex] = isValid
            vals[paramIndex] = val

            this.setState(this.valsToPreviewData(this.props.tokenLabel, {
                allValid: validities.every(function(validity) {
                    return validity
                }),
                validities: validities,
                vals: vals
            }))
        },
        handleSubmit: function(e) {
            e.preventDefault()
            this.props.onSubmit(this.state.previewData)
        },

        render: function() {
            var self = this
            var inputCompos = this.state.params &&
                this.state.params.map(function(param, i) {
                    return <FormField
                        param={param}
                        selData={self.props.selData}
                        onChange={self.handleChange}
                        paramIndex={i} key={i} />
                })
            return (
                <form onSubmit={this.handleSubmit}
                    className="create-form">
                    <div className="create-form-inputs">
                        {inputCompos}
                        <input type="submit" value="Create"
                            disabled={! this.state.previewData} />
                        <p ref="overallError" className="error">
                            {this.state.overallErrorMsg}
                        </p>
                    </div>
                    <div className="create-form-preview">
                        <p>Preview</p>
                        <Cell data={this.state.previewData} />
                    </div>
                </form>
            )
        }
    })
    var FormField = React.createClass({
        componentDidMount: function() {
            this.withValidatableInput(this.validateAndPropagateElm)
        },
        shouldComponentUpdate: function(nextProps) {
            // both obj ref equality
            return this.props.param !== nextProps.param
                || this.props.selData !== nextProps.selData
        },
        componentDidUpdate: function() {
            // we could reset validatableInput val here, iff param changed, not if selData changed.
            this.withValidatableInput(this.validateAndPropagateElm)
        },

        withValidatableInput: function(fn) {
            // radios won't have a validatableInput
            var validatableInput = this.refs.validatableInput
                && this.refs.validatableInput.getDOMNode()
            if (validatableInput) {
                fn(validatableInput)
            }
        },

        validateAndPropagate: function(input, value) {
            // radios don't have validate fn
            var isValid = ! this.props.param.validate
                || this.props.param.validate(value)
            try {
                input.classList.toggle('error', ! isValid)
            } catch(e) {
                // screw you ie i ain't polyfilling
            }
            this.props.onChange(
                this.props.paramIndex,
                isValid,
                value
            )
        },
        validateAndPropagateElm: function(input) {
            this.validateAndPropagate(input, input.value)
        },
        handleChange: function(e) {
            this.validateAndPropagateElm(e.target)
        },

        render: function() {
            var self = this
            var param = this.props.param
            var inputCompo
            if (param.choices) {
                inputCompo = Object.keys(param.choices).map(function(choiceLabel) {
                    var choiceVal = param.choices[choiceLabel]
                    return (
                        <label key={choiceVal}>
                            <input type="radio"
                                name={'pattern-editor-create-param-' + self.props.paramIndex}
                                value={choiceVal}
                                onChange={self.handleChange} />
                            <span>{choiceLabel}</span>
                        </label>
                    )
                })
            } else {
                if (typeof param.validate !== 'function') {
                    console.error('param doesn\'t have a validator', param)
                } else {
                    if (param.paramType === 'component') {
                        // mosue nav?
                        inputCompo =
                            <FormFieldDroppable
                                param={this.props.param}
                                selData={this.props.selData}
                                onValidateAndPropagate={this.validateAndPropagate} />
                    } else if (typeof param.validate === 'function') {
                        inputCompo = <input type="text"
                            onChange={this.handleChange}
                            ref="validatableInput" />
                    }
                }
                
            }
            return (
                <label>
                    <span>{param.label}</span>
                    {inputCompo}
                </label>
            )
        }
    })
    var FormFieldDroppable = React.createClass({
        getInitialState: function() {
            return {
                droppedData: null
            }
        },
        componentDidMount: function() {
            this.validateAndPropagate()
        },
        componentDidUpdate: function() {
            this.validateAndPropagate()
        },
        validateAndPropagate: function() {
            this.props.onValidateAndPropagate(this.getDOMNode(), this.state.droppedData)
        },
        handlePasteCompo: function(e) {
            if (! this.props.selData) {
                return
            }
            this.setState({
                // need to clone so selData can be used multiple times
                //     in parent's previewData, without having its .ui overridden.
                droppedData: Object.create(this.props.selData)
            })
            this.validateAndPropagate()
        },
        render: function() {
            var content = this.state.droppedData
                ? <Cell data={this.state.droppedData} />
                : <p className="error">Click on palette to select; click here to drop.</p>
            return <div onClick={this.handlePasteCompo}
                    className="component-droppable">
                    {content}
                </div>
        }
    })

    var Palette = React.createClass({
        getInitialState: function() {
            return {
                selCellIndex: null
            }
        },
        handleSelect: function(cell) {
            this.setState({
                selCellIndex: cell.props.cellIndex
            })
            this.props.onSelect(cell.props.data)
        },
        handleDelete: function(cell) {
            this.setState({
                selCellIndex: null
            })
            this.props.onDelete(cell.cellIndex)
        },
        render: function() {
            var self = this
            var minNumCells = 5
            var datasInPalette = this.props.datasInPalette
            var cells = Array.apply(null, {
                    // +1 so there is always an empty cell
                    length: Math.max(minNumCells, datasInPalette.length + 1)
                })
                .map(function(foo, i) {
                    return <Cell
                        data={datasInPalette[i]}
                        isSelected={self.state.selCellIndex === i}
                        onSelect={self.handleSelect}
                        onDelete={self.handleDelete}
                        cellIndex={i} key={i} />
                })
            return (
                <div className="palette">
                    {cells}
                </div>
            )
        }
    })

    /*
        in props ~= {
            data: required

            // below are required iff in palette
            isSelected
            cellIndex
            onSelect
            onDelete
        }
    */
    var Cell = React.createClass({
        handleSelect: function() {
            if (this.props.onSelect) {
                this.props.onSelect(this)
            }
        },
        handleDelete: function() {
            if (this.props.onDelete) {
                this.props.onDelete(this)
            }
        },
        render: function() {
            var data = this.props.data
            if (data) {
                // add ui data individually per cell b/c otherwise `data.ui` will
                // get overridden if the compo is embedded (as a field for another compo).
                data = Object.create(data)
                surfaceData.addUiData(data)
            }
            var deleteBtn = this.props.onDelete
                ? <button onClick={this.handleDelete} className="del">X</button>
                : null
            return data
                ? (
                    <div className="pelette-cell">
                        <reactClasses.Surface
                            tree={data}
                            onSelect={this.handleSelect}
                            patternSel={this.props.isSelected
                                ? [0, Infinity]
                                : null}
                            patternEditorMode="select" />
                        {deleteBtn}
                    </div>
                )
                : (
                    <div className="empty-surface" />
                )
        }
    })

    reactClasses.PatternEditor = PatternEditor
})(window.reactClasses = window.reactClasses || {})
