;(function() {
    'use strict'
    
    var Controls = React.createClass({
        getInitialState: function() {
            var parts = this.parseHash() || {
                pattern: '',
                flags: ''
            }
            parts.tree = this.textsToTree(parts)
            return parts
        },
        componentDidMount: function() {
            window.addEventListener('hashchange', this.updateSelfFromHash)
        },

        readHash: function() {
            return decodeURIComponent(window.location.hash.slice(1))
        },
        parseHash: function() {
            // TODO test
            var hash = this.readHash()
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
        updateSelfFromHash: function() {
            var parts = this.parseHash()
            if (parts) {
                this.handleTextsChange(parts)
            }
        },
        updateHash: function(parts) {
            var hash = parts.pattern.length
                + ','
                + parts.pattern
                + parts.flags
            if (hash === this.readHash()) {
                return
            }
            window.location.hash = encodeURIComponent(hash)
        },

        textsToTree: function(parts) {
            try {
                return parser.parse(parts.pattern)
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
            this.updateHash(state)
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
