(function() {
    var Whole = React.createClass({
        getInitialState: function() {
            return {
                pattern: '',
                flags: [],
                tree: []
            }
        },
        textsToViz: function(texts) {
            function patternToTree(str) {
                // will be replaced by jison
                return str.split('').map(function(c) {
                    if (c === 'r') {
                        return {
                            label: 'hello',
                            repeat: {
                                min: 0,
                                max: Infinity
                            }
                        }
                    } else {
                        return {
                            label: 'anyChar'
                        }
                    }
                })
            }
            this.setState({
                pattern: texts.pattern,
                flags: texts.flags,
                tree: patternToTree(texts.pattern)
            })
        },
        vizToTexts: function(someData) {
            function treeToPattern(arr) {
                return arr.map(function() {
                    if (arr.label === 'anyChar') {
                        return 'x'
                    } else {
                        return 'r'
                    }
                })
            }
            this.setState({
                pattern: treeToPattern(someData.tree),
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
