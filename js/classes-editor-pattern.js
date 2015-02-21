;(function(reactClasses) {
    'use strict'

    var PatternEditor = React.createClass({
        getInitialState: function() {
            return {
                tokenLabel: null,
                dataPerCell: []
            }
        },
        handleChangeTypeToCreate: function(e) {
            this.setState({
                tokenLabel: e.target.value
            })
        },
        handleCreate: function(data) {
            this.setState({
                dataPerCell: this.state.dataPerCell.concat(data)
            })
        },
        render: function() {
            var self = this
            var createOptions = tokenCreator.tokenLabels.map(function(tokenLabel) {
                return (
                    <label key={tokenLabel}>
                        <input type="radio" name="palette-editor-create-type"
                            value={tokenLabel}
                            onChange={self.handleChangeTypeToCreate} />
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
                            onSubmit={this.handleCreate} />
                    </div>
                    <Palette tokenLabel={this.state.tokenLabel}
                        dataPerCell={this.state.dataPerCell}
                        onSelect={this.props.onSelect} />
                </div>
            )
        }
    })
    var CreateForm = React.createClass({
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
                vals: [],
                previewData: this.valsToPreviewData(allValid, tokenLabel, [])
            }
        },
        getInitialState: function() {
            return this.typeToInitState(this.props.tokenLabel)
        },
        componentWillReceiveProps: function(nextProps) {
            if (this.props.tokenLabel !== nextProps.tokenLabel) {
                this.setState(
                    this.typeToInitState(nextProps.tokenLabel))
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
                return <CreateFormField param={param}
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
            this.handleChange()
        },
        handleChange: function(e) {
            var input = this.refs.validatableInput
                ? this.refs.validatableInput.getDOMNode()
                : e && e.target
            if (! input) {
                return
            }
            var isValid = this.props.param.validate
                ? this.props.param.validate(input.value)
                : true
            input.classList[isValid ? 'remove' : 'add']('error')
            this.props.onChange(
                this.props.paramIndex,
                isValid,
                input.value
            )
        },
        render: function() {
            var self = this
            var param = this.props.param
            var inputCompo = param.choices
                ? Object.keys(param.choices).map(function(choiceLabel) {
                    var choiceVal = param.choices[choiceLabel]
                    return (
                        <label>
                            <input type="radio"
                                name={'pallette-editor-create-param-' + self.props.paramIndex}
                                value={choiceVal}
                                onChange={self.handleChange} />
                            <span>{choiceLabel}</span>
                        </label>
                    )
                })
                : (
                    <input type="text" onChange={self.handleChange}
                        ref="validatableInput" />
                )
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
            var text = tokenCreator.toString(
                this.props.tokenLabel, cell.props.data)
            this.setState({
                selectedCellIndex: cell.props.cellIndex
            })
            this.props.onSelect(text)
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
                        cellIndex={i} ref={i} key={i} />
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
                        : null
                })
                : (
                    <div className="empty-surface" />
                )
        }
    })

    reactClasses.PatternEditor = PatternEditor
})(window.reactClasses = window.reactClasses || {})
