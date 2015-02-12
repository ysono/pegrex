;(function() {
    'use strict'

    var hashUtil = {
        read: function() {
            return decodeURIComponent(window.location.hash.slice(1))
        },
        parse: function() {
            // TODO test
            var hash = hashUtil.read()
            var commaIndex = hash.indexOf(',')
            if (commaIndex <= 0) { return }
            var patternLen = Number(hash.slice(0, commaIndex))
            if (isNaN(patternLen)) { return }
            var flagsIndex = commaIndex + 1 + patternLen
            return {
                pattern: hash.slice(commaIndex + 1, flagsIndex),
                flags: hash.slice(flagsIndex)
            }
        },
        update: function(parts) {
            var hash = parts.pattern.length
                + ','
                + parts.pattern
                + parts.flags
            if (hash === hashUtil.read()) {
                return
            }
            window.location.hash = encodeURIComponent(hash)
        }
    }
    
    var Controls = React.createClass({
        getInitialState: function() {
            var parts = hashUtil.parse() || {
                pattern: '',
                flags: ''
            }
            parts.tree = this.textsToTree(parts)
            return parts
        },
        componentDidMount: function() {
            var updateSelfFromHash = (function() {
                var parts = hashUtil.parse()
                if (parts) {
                    this.handleTextsChange(parts)
                }
            }).bind(this)
            window.addEventListener('hashchange', updateSelfFromHash)
        },

        textsToTree: function(parts) {
            var tree
            try {
                tree = parser.parse(parts.pattern)
                reactClasses.addUiData(tree)
                return tree
            } catch(e) {
                // don't propagate b/c still want text states updated
                // TODO highlight text location
                console.error('parsing failed', e)
            }
        },
        handleTextsChange: function(parts) {
            if ( this.state.pattern === parts.pattern
                && this.state.flags === parts.flags ) {
                return
            }
            var state = {
                pattern: parts.pattern,
                flags: parts.flags,
                tree: this.textsToTree(parts)
            }
            hashUtil.update(state)
            this.setState(state)
        },

        render: function() {
            return (
                <div className="controls">
                    <reactClasses.Texts
                        pattern={this.state.pattern}
                        flags={this.state.flags}
                        onChange={this.handleTextsChange} />
                    <reactClasses.Surface
                        tree={this.state.tree}
                        flags={this.state.flags} />
                </div>
            )
        }
    })
    React.render(
        <Controls />,
        document.getElementsByClassName('controls-parent')[0]
    )
})()
