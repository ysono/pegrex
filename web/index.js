(function() {
    var Whole = React.createClass({
        getInitialState: function() {
            return {
                pattern: '',
                flags: [],
                tree: {}
            }
        },
        textsToViz: function(texts) {
            var tree
            try {
                tree = parser.parse(texts.pattern)
            } catch(e) {
                // don't propagate b/c still want text states updated
                // TODO highlight text or something
                console.error('parsing failed', e)
                tree = {}
            }
            this.setState({
                pattern: texts.pattern,
                flags: texts.flags,
                tree: tree
            })
        },
        vizToTexts: function(someData) {
            // TODO treeToPattern
            this.setState({
                // pattern: treeToPattern(someData.tree),
                flags: someData.flags,
                tree: someData.tree
            })
        },
        render: function() {
            return (
                <div>
                    <reactClasses.Texts
                        pattern={this.state.pattern}
                        flags={this.state.flags}
                        onChange={this.textsToViz} />
                    <reactClasses.Surface
                        tree={this.state.tree}
                        flags={this.state.flags}
                        onChange={this.vizToTexts} />
                </div>
            )
        }
    })
    React.render(
        <Whole />,
        document.getElementById('content')
    )
})()
