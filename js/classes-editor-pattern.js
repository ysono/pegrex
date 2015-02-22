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
                    <Palette
                        datasInPalette={this.state.datasInPalette}
                        onSelect={this.handlePaletteSelect} />
                </div>
            )
        }
    })

    var Form = React.createClass({
        getInitialState: function() {
            return this.typeToInitState(this.props.tokenLabel)
        },
        componentWillReceiveProps: function(nextProps) {
            if (this.props.tokenLabel !== nextProps.tokenLabel) {
                this.setState(
                    this.typeToInitState(nextProps.tokenLabel))
            }
        },

        valsToPreviewData: function(allValid, tokenLabel, vals) {
            if (! allValid) { 
                return null
            }
            return tokenCreator.create(tokenLabel, vals)
        },
        typeToInitState: function(tokenLabel) {
            if (! tokenLabel) {
                return {
                    allValid: false
                }
            }
            var params = tokenCreator.getParams(tokenLabel)
            var allValid = ! params.length
            var vals = []
            return {
                params: params,
                allValid: allValid,
                validities: params.map(function() {
                    return false
                }),
                vals: vals, // will be sparse array
                previewData: this.valsToPreviewData(allValid, tokenLabel, vals)
            }
        },

        handleChange: function(paramIndex, isValid, val) {
            var validities = this.state.validities
            var vals = this.state.vals
            validities[paramIndex] = isValid
            vals[paramIndex] = val
            var allValid = validities.every(function(validity) {
                return validity
            })
            this.setState({
                allValid: allValid,
                validities: validities,
                vals: vals,
                previewData: this.valsToPreviewData(allValid,
                    this.props.tokenLabel, vals)
            })
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
                            disabled={! this.state.allValid} />
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
            this.withValidatableInput(this.validateElm)
        },
        shouldComponentUpdate: function(nextProps) {
            // both obj ref equality
            return this.props.param !== nextProps.param
                || this.props.selData !== nextProps.selData
        },
        componentDidUpdate: function() {
            // we could reset validatableInput val here, iff param changed, not if selData changed.
            this.withValidatableInput(this.validateElm)
        },

        withValidatableInput: function(fn) {
            // radios won't have a validatableInput
            var validatableInput = this.refs.validatableInput
                && this.refs.validatableInput.getDOMNode()
            if (validatableInput) {
                fn(validatableInput)
            }
        },

        validate: function(input, value) {
            // radios don't have validate fn
            var isValid = ! this.props.param.validate
                || this.props.param.validate(value)
            input.classList[isValid ? 'remove' : 'add']('error')
            this.props.onChange(
                this.props.paramIndex,
                isValid,
                value
            )
        },
        validateElm: function(input) {
            this.validate(input, input.value)
        },
        handleChange: function(e) {
            this.validateElm(e.target)
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
                                onValidate={this.validate} />
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
            this.validate()
        },
        componentDidUpdate: function() {
            this.validate()
        },
        validate: function() {
            this.props.onValidate(this.getDOMNode(), this.state.droppedData)
        },
        handlePasteCompo: function(e) {
            if (! this.props.selData) {
                return
            }
            this.setState({
                droppedData: this.props.selData
            })
            this.validate()
        },
        render: function() {
            return <div onClick={this.handlePasteCompo}
                    className="component-droppable">
                    <Cell data={this.state.droppedData} />
                </div>
        }
    })

    var Palette = React.createClass({
        getInitialState: function() {
            return {
                selectedCellIndex: null // TODO what if cell is deleted? use a unique id.
            }
        },
        handleSelect: function(cell) {
            this.setState({
                selectedCellIndex: cell.props.cellIndexInPalette
            })
            this.props.onSelect(cell.props.data)
        },
        render: function() {
            var self = this
            var minNumCells = 10
            var datasInPalette = this.props.datasInPalette
            var cells = Array.apply(null, {
                    length: Math.max(minNumCells, datasInPalette.length)
                })
                .map(function(foo, i) {
                    return <Cell
                        data={datasInPalette[i]}
                        isSelected={self.state.selectedCellIndex === i}
                        onSelect={self.handleSelect}
                        cellIndexInPalette={i} key={i} />
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
            isSelected: required iff in palette
            onSelect: required iff in palette
            cellIndexInPalette: required iff in palette
        }
    */
    var Cell = React.createClass({
        handleSelect: function() {
            if (this.props.onSelect) {
                this.props.onSelect(this)
            }
        },
        shouldComponentUpdate: function() {
            // never re-render already rendered cells in palette
            // always re-render in fields and preview
            if (this.props.cellIndexInPalette === 'number'
                && this.props.data) {
                return false
            }
            return true
        },
        render: function() {
            // add ui data individually per cell b/c otherwise `data.ui` will
            // get overridden if the compo is embedded (as a field for another compo).
            var data = this.props.data
            if (data) {
                data = Object.create(data)
                surfaceData.addUiData(data)
            }
            return data
                ? React.createElement(reactClasses.Surface, {
                    tree: data,
                    onSelect: this.handleSelect,
                    patternSel: this.props.isSelected
                        ? [0, Infinity] // so that the whole thing is always selected
                        : null,
                    patternEditorMode: 'select'
                })
                : (
                    <div className="empty-surface" />
                )
        }
    })

    reactClasses.PatternEditor = PatternEditor
})(window.reactClasses = window.reactClasses || {})
