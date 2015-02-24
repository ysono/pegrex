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
            var newState = this.valsToPreviewData(nextProps.tokenLabel, {
                params: params,
                allValid: ! params.length,
                validities: params.map(function() {
                    return false
                }), // make dense so allValid can be correctly derived.
                vals: [] // sparse array
            })
            this.setState(newState)
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

        handleChange: function(fieldProps, elm) {
            var isValid = ! fieldProps.param.validate
                || fieldProps.param.validate(elm.value)
            elm.classList.toggle('error', ! isValid)
                // not ie does not read second arg as a flag

            this.state.validities[fieldProps.paramIndex] = isValid
            this.state.vals[fieldProps.paramIndex] = elm.value
            this.state.allValid = this.state.validities.every(function(validity) {
                return validity
            })
            this.setState(
                this.valsToPreviewData(this.props.tokenLabel, this.state) )
        },
        handleSubmit: function(e) {
            e.preventDefault()
            this.props.onSubmit(this.state.previewData)
        },

        render: function() {
            var self = this
            var inputCompos = this.state.params &&
                this.state.params.map(function(param, i) {
                    // TODO mult
                    var clazz = param.choices ? FormFieldRadio
                        : param.paramType === 'component' ? FormFieldDroppable
                        : FormFieldText
                    return React.createElement(clazz, {
                        param: param,
                        val: self.state.vals[i] || param.default || '',
                        selData: self.props.selData,
                        onChange: self.handleChange,
                        paramIndex: i,
                        key: i
                    })
                })
            return (
                <form onSubmit={this.handleSubmit}
                    className="create-form">
                    <div className="create-form-inputs">
                        {inputCompos}
                        <input type="submit" value="Create"
                            disabled={! this.state.previewData} />
                        <p ref="overallError" className="error">
                            {this.state.overallErrorMsg}</p>
                    </div>
                    <div className="create-form-preview">
                        <p>Preview</p>
                        <Cell data={this.state.previewData} />
                    </div>
                </form>
            )
        }
    })
    // var FormFieldMult = React.createClass({
    //     getInitialState: function() {
    //         return {
    //             singleVals: [null], // set the initial count of mult fields: 1
    //             singleValidities: []
    //         }
    //     },
    //     handleChange: function(singleFieldProps, isValid, val) {
    //         var multIndex = singleFieldProps.multIndex
    //         this.state.singleValidities[multIndex] = isValid
    //         this.state.singleVals[multIndex] = val

    //         this.setState({
    //             singleValidities: this.state.singleValidities,
    //             singleVals: this.state.singleVals
    //         })

    //         var allValid = this.state.singleValidities.every(function(validity) {
    //             return validity
    //         })
    //         this.props.onChange(
    //             this.props,
    //             allValid,
    //             this.state.singleVals)
    //     },
    //     handleAddMult: function() {
    //         this.setState({
    //             singleVals: this.state.singleVals.concat(null)
    //         })
    //     },
    //     handleDelMult: function(e) {
    //         var multIndex = Number(e.target.getAttribute('data-mult-index'))
    //         console.info('deleting mult index', multIndex)
    //         this.state.singleValidities.splice(multIndex, 1)
    //         this.state.singleVals.splice(multIndex, 1)
    //         this.setState({
    //             singleValidities: this.state.singleValidities,
    //             singleVals: this.state.singleVals
    //         })
    //         // e.props.multIndex
    //     },
    //     render: function() {
    //         var self = this
    //         var fields = this.state.singleVals.map(function(foo, i) {
    //             return <div key={i}>
    //                     <FormField
    //                         param={self.props.param}
    //                         paramIndex={self.props.paramIndex}
    //                         selData={self.props.selData}
    //                         onChange={self.handleChange}
    //                         multIndex={i} />
    //                     <button type="button" className="mult"
    //                         onClick={self.handleDelMult}
    //                         data-mult-index={i}>-</button>
    //                 </div>
    //         })
    //         debugger
    //         return <div>
    //                 <button type="button" className="mult"
    //                     onClick={this.handleAddMult}>+</button>
    //                 {fields}
    //             </div>
    //     }
    // })
    var FormFieldText = React.createClass({
        componentDidMount: function() {
            this.handleChange()
        },
        handleChange: function(e) {
            var input = e ? e.target : this.refs.input.getDOMNode()
            this.props.onChange(this.props, input)
        },
        render: function() {
            return <label>
                <span>{this.props.param.label}</span>
                <input type="text"
                    value={this.props.val}
                    onChange={this.handleChange}
                    ref="input" />
            </label>
        }
    })
    var FormFieldRadio = React.createClass({
        handleChange: function(e) {
            var input = e.target
            this.props.onChange(this.props, input)
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
            return <label>
                <span>{this.props.param.label}</span>
                {radios}
            </label>
        }
    })
    var FormFieldDroppable = React.createClass({
        getInitialState: function() {
            return {
                droppedData: null
            }
        },
        handlePasteCompo: function(e) {
            // mocking <input>. All that matters is `value` prop.
            var input = this.refs.input.getDOMNode()
            input.value = this.props.selData
            this.setState({
                droppedData: this.props.selData
            })
            this.props.onChange(this.props, input)
        },
        render: function() {
            var pastedCompo = this.state.droppedData
                ? <Cell data={this.state.droppedData} />
                : <p className="error">Click on palette to copy; click here to paste.</p>
            return <label>
                <span>{this.props.param.label}</span>
                <div onClick={this.handlePasteCompo}
                    className="component-droppable"
                    ref="input">
                    {pastedCompo}
                </div>
            </label>
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
            this.props.onDelete(cell.props.cellIndex)
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
            return <div className="palette">
                    {cells}
                </div>
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
                : <div className="empty-surface" />
        }
    })

    reactClasses.PatternEditor = PatternEditor
})(window.reactClasses = window.reactClasses || {})
