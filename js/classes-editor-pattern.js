;(function(reactClasses) {
    'use strict'

    var PatternEditor = React.createClass({
        getInitialState: function() {
            return {
                createType: null,
                createParams: [],
                dataPerCell: Array.apply(null, {length: 10})
            }
        },
        handleChangeCreateType: function(e) {
            var type = e.target.value
            this.setState({
                createType: type,
                createParams: editorData.typeToParams[type]
            })
        },
        handleCreate: function(inputs) {
            var data = editorData.build(
                this.state.createType,
                inputs)

            var dataPerCell = this.state.dataPerCell
            var emptyCellIndex
            dataPerCell.some(function(data, i) {
                if (! data) {
                    emptyCellIndex = i
                    return true
                }
            })
            if (typeof emptyCellIndex === 'number') {
                dataPerCell[emptyCellIndex] = data
            } else {
                dataPerCell.push(data)
            }
            this.setState({
                dataPerCell: dataPerCell
            })
        },
        render: function() {
            var self = this
            var typeToParams = editorData.typeToParams
            var createOptions = Object.keys(typeToParams).map(function(type, i) {
                return (
                    <label key={i}>
                        <input type="radio" name="palette-editor-create-type"
                            value={type}
                            onChange={self.handleChangeCreateType} />
                        <span>{type}</span>
                    </label>
                )
            })
            return (
                <div className="pattern-editor">
                    <fieldset>
                        <legend>Create</legend>
                        {createOptions}
                    </fieldset>
                    <CreateForm params={this.state.createParams}
                        onSubmit={this.handleCreate} />
                    <Palette dataPerCell={this.state.dataPerCell} />
                </div>
            )
        }
    })
    var CreateForm = React.createClass({
        handleSubmit: function(e) {
            e.preventDefault()
            var refs = this.refs
            var payload = Object.keys(refs).reduce(function(payload, builderArgInex) {
                var val = refs[builderArgInex].getDOMNode().value
                payload[builderArgInex] = val
                return payload
            }, {})
            this.props.onSubmit(payload)
        },
        render: function() {
            var params = this.props.params
            var inputNodes = params.map(function(param) {
                return (
                    <label>
                        <span>{param.label}</span>
                        <input type="text"
                            ref={param.builderArgIndex} />
                    </label>
                )
            })
            return (
                <form onSubmit={this.handleSubmit}>
                    {inputNodes}
                    <input type="submit" value="Create" />
                </form>
            )
        }
    })
    var Palette = React.createClass({
        render: function() {
            var cells = this.props.dataPerCell.map(function(data, i) {
                return (<Cell data={data} key={i} />)
            })
            return (
                <div>
                    {cells}
                </div>
            )
        }
    })
    var Cell = React.createClass({
        render: function() {
            var data = this.props.data
            return data
                ? React.createElement(reactClasses.Surface, {
                    onSelect: function() {},
                    tree: data
                })
                : null
        }
    })

    reactClasses.PatternEditor = PatternEditor
})(window.reactClasses = window.reactClasses || {})
