;(function(reactClasses) {
    'use strict'

    var PatternEditor = React.createClass({
        getInitialState: function() {
            return {
                typeToCreate: null,
                paramsForCreate: [],
                dataPerCell: []
            }
        },
        handleChangeTypeToCreate: function(e) {
            var type = e.target.value
            this.setState({
                typeToCreate: type,
                paramsForCreate: tokenCreator.typeToParams[type]
            })
        },
        handleCreate: function(inputs) {
            var data = tokenCreator.create(
                this.state.typeToCreate,
                inputs)

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
                        <CreateForm params={this.state.paramsForCreate}
                            onSubmit={this.handleCreate} />
                    </div>
                    <Palette dataPerCell={this.state.dataPerCell}
                        onSelect={this.props.onSelect} />
                </div>
            )
        }
    })
    var CreateForm = React.createClass({
        handleSubmit: function(e) {
            e.preventDefault()
            var refs = this.refs
            var isValid = true
            var payload = Object.keys(refs).reduce(function(payload, builderArgIndex) {
                var ref = refs[builderArgIndex]
                var val = ref.getDOMNode().value
                if (! ref.props.validate(val)) {
                    console.error('val', val, 'is not valid for arg #', builderArgIndex) // TODO show to user
                    isValid = false
                    return
                }
                payload[builderArgIndex] = val
                return payload
            }, {})
            if (isValid) {
                this.props.onSubmit(payload)
            }
        },
        render: function() {
            var params = this.props.params
            var inputCompos = params.map(function(param, i) {
                return (
                    <label key={i}>
                        <span>{param.label}</span>
                        <input type="text"
                            pattern={param.pattern}
                            validate={param.validate}
                            ref={param.builderArgIndex} />
                    </label>
                )
            })
            return (
                <form onSubmit={this.handleSubmit}
                    className="create-form">
                    {inputCompos}
                    <input type="submit" value="Create" />
                </form>
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
                selectedCellIndex: cell.props.index
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
                        index={i} ref={i} key={i} />
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
