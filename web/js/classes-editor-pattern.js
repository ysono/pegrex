;(function(reactClasses) {
    'use strict'

    var PatternEditor = React.createClass({
        getInitialState: function() {
            return {
                tokenLabel: null,
                dataPerCell: [],
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
                dataPerCell: this.state.dataPerCell.concat(data)
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
                        <CreateForm
                            tokenLabel={this.state.tokenLabel}
                            selData={this.state.selData}
                            onSubmit={this.handleCreate} />
                    </div>
                    <Palette
                        dataPerCell={this.state.dataPerCell}
                        onSelect={this.handlePaletteSelect} />
                </div>
            )
        }
    })
    var CreateForm = React.createClass({
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
            return {
                params: params,
                allValid: allValid,
                validities: params.map(function() {
                    return false
                }),
                vals: [], // will be sparse array
                previewData: this.valsToPreviewData(allValid, tokenLabel, [])
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
            var inputCompos = (this.state.params || []).map(function(param, i) {
                return <CreateFormField
                    param={param}
                    tokenLabel={self.props.tokenLabel}
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
                        <Cell data={this.state.previewData}
                            onSelect={function() {}} />
                    </div>
                </form>
            )
        }
    })
    var CreateFormField = React.createClass({
        componentDidMount: function() {
            if (this.refs.validatableInput) {
                this.validate(
                    this.refs.validatableInput.getDOMNode())
            }
        },
        shouldComponentUpdate: function(nextProps) {
            return this.props.tokenLabel !== nextProps.tokenLabel
        },
        handlePasteCompo: function(e) {
            if (! this.props.selData) {
                return
            }
            var surface = React.createElement(reactClasses.Surface, {
                    tree: this.props.selData,
                    onSelect: function() {}, // not selectable
                    patternSel: undefined, // visually not selectable
                    patternEditorMode: undefined // no pointer
                })
            var container = e.target
            // container.appendChild(surface.getDOMNode()) // TODO
            container.value = this.props.selData // using value prop on non-input elm.
            this.validate(container)
        },
        validate: function(input) {
            var value = input.value
            var isValid = ! this.props.param.validate
                || this.props.param.validate(value)
            input.classList[isValid ? 'remove' : 'add']('error')
            this.props.onChange(
                this.props.paramIndex,
                isValid,
                value
            )
        },
        handleChange: function(e) {
            this.validate(e.target)
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
            } else if (param.paramType === 'component') {
                // TODO droppable
                inputCompo = <div onClick={this.handlePasteCompo}
                    className="droppable" />
            } else if (typeof param.validate === 'function') {
                inputCompo = <input type="text" onChange={this.handleChange}
                    ref="validatableInput" />
            }
            // else param is coded w insufficient info
            return (
                <label>
                    <span>{param.label}</span>
                    {inputCompo}
                </label>
            )
        }
    })
    var Palette = React.createClass({
        getInitialState: function() {
            return {
                selectedCellIndex: null // TODO what if cell is deleted? might have to move this to parent
            }
        },
        handleSelect: function(cell) {
            this.setState({
                selectedCellIndex: cell.props.cellIndex
            })
            this.props.onSelect(cell.props.data)
        },
        render: function() {
            var self = this
            var minNumCells = 10
            var dataPerCell = this.props.dataPerCell
            var cells = Array.apply(null, {
                    length: Math.max(minNumCells, dataPerCell.length)
                })
                .map(function(foo, i) {
                    return <Cell data={dataPerCell[i]}
                        isSelected={self.state.selectedCellIndex === i}
                        onSelect={self.handleSelect}
                        cellIndex={i} key={i} />
                })
            return (
                <div className="palette">
                    {cells}
                </div>
            )
        }
    })
    var Cell = React.createClass({
        handleSelect: function() {
            this.props.onSelect(this)
        },
        render: function() {
            var data = this.props.data
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
