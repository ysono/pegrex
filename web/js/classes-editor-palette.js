;(function(reactClasses) {
    var PatternEditor = React.createClass({
        getInitialState: function() {
            return {
                dataPerCell: Array.apply(null, {length: 10})
            }
        },
        onCreate: function() {
            var data = parser.yy.b.specificChar('p')
            surfaceData.addUiData(data)
            var emptyCellIndex
            this.state.dataPerCell.some(function(data, i) {
                if (! data) {
                    emptyCellIndex = i
                    return true
                }
            })
            if (typeof emptyCellIndex !== 'number') {
                throw 'no enough room'
            }
            this.state.dataPerCell[emptyCellIndex] = data
            this.setState({
                dataPerCell: this.state.dataPerCell
            }) // i think no args works?
        },
        render: function() {
            return (
                <div>
                    <button onClick={this.onCreate}>Create Specific Char</button>
                    <Palette dataPerCell={this.state.dataPerCell} />
                </div>
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
            var surface = data
                ? (
                    <svg>
                        {React.createElement(reactClasses.boxedClass, {
                            onEvents: function() {},
                            data: data
                        })}
                    </svg>
                )
                // ? React.createElement(reactClasses.Surface, {
                //     onSelect: function() {},
                //     tree: data
                // })
                : null
            return surface
        }
    })

    reactClasses.PatternEditor = PatternEditor
})(window.reactClasses = window.reactClasses || {})
