;(function(reactClasses) {
    'use strict'

    var PatternEditor = React.createClass({
        getInitialState: function() {
            return {
                typeToCreate: null,
                dataPerCell: []
            }
        },
        handleChangeTypeToCreate: function(e) {
            this.setState({
                typeToCreate: e.target.value
            })
        },
        handleCreate: function(data) {
            this.state.dataPerCell.push(data)
            this.setState({
                dataPerCell: this.state.dataPerCell
            })
        },
        render: function() {
            var self = this
            var typeToParams = tokenCreator.typeToParams
            var createOptions = Object.keys(typeToParams).map(function(type) {
                return (
                    <label key={type}>
                        <input type="radio" name="palette-editor-create-type"
                            value={type}
                            onChange={self.handleChangeTypeToCreate} />
                        <span>{type}</span>
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
                            typeToCreate={this.state.typeToCreate}
                            onSubmit={this.handleCreate} />
                    </div>
                    <Palette dataPerCell={this.state.dataPerCell}
                        onSelect={this.props.onSelect} />
                </div>
            )
        }
    })
    var CreateForm = React.createClass({
        valsToPreviewData: function(allValid, type, vals) {
            if (! allValid) { 
                return null
            }
            return tokenCreator.create(type, vals)
        },

        typeToInitState: function(type) {
            if (! type) {
                return {
                    allValid: false
                }
            }
            var params = tokenCreator.typeToParams[type]
            var allValid = ! params.length
            return {
                params: params,
                allValid: allValid,
                validities: params.reduce(function(map, param) {
                    map[param.builderArgIndex] = false
                    return map
                }, {}),
                vals: {},
                previewData: this.valsToPreviewData(allValid, type, {})
            }
        },
        getInitialState: function() {
            return this.typeToInitState(this.props.typeToCreate)
        },
        componentWillReceiveProps: function(nextProps) {
            this.setState(
                this.typeToInitState(nextProps.typeToCreate))
        },

        handleChange: function(builderArgIndex, isValid, val) {
            var validities = this.state.validities
            var vals = this.state.vals
            validities[builderArgIndex] = isValid
            vals[builderArgIndex] = val

            var allValid = Object.keys(validities).every(function(ind) {
                return validities[ind]
            })

            this.setState({
                allValid: allValid,
                validities: validities,
                vals: vals,
                previewData: this.valsToPreviewData(allValid,
                    this.props.typeToCreate, vals)
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
                    key={i} />
            })
            return (
                <div className="create-form-parent">
                    <form onSubmit={this.handleSubmit}
                        className="create-form">
                        {inputCompos}
                        <input type="submit" value="Create"
                            disabled={! this.state.allValid} />
                    </form>
                    <div className="create-form-preview">
                        <p>Preview</p>
                        <Cell data={this.state.previewData}
                            onSelect={function() {}}
                            ref="review" />
                    </div>
                </div>
            )
        }
    })
    var CreateFormField = React.createClass({
        componentDidMount: function() {
            this.handleChange()
        },
        handleChange: function() {
            var input = this.refs.input.getDOMNode()
            var isValid = this.props.param.validate(input.value)
            input.classList[isValid ? 'remove' : 'add']('error')
            this.props.onChange(
                this.props.param.builderArgIndex,
                isValid,
                input.value
            )
        },
        render: function() {
            var param = this.props.param
            // todo default value
            return (
                <label>
                    <span>{param.label}</span>
                    <input type="text"
                        onChange={this.handleChange}
                        ref="input" />
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
            var text = tokenCreator.toString(cell.props.data)
            this.setState({
                selectedCellIndex: cell.props.paletteIndex
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
                        paletteIndex={i} ref={i} key={i} />
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
