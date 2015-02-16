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
            window.location.replace('#' + encodeURIComponent(hash))
        }
    }
    
    var Controls = React.createClass({
        getInitialState: function() {
            var state = hashUtil.parse() || {
                pattern: '',
                flags: ''
            }
            this.patternToTree(state)
            state.patternSel = null // will be [n,n] - beg/end indices of selection.
            return state
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

        patternToTree: function(parts) {
            try {
                parts.tree = parser.parse(parts.pattern)
                surfaceData.addUiData(parts.tree)
            } catch(e) {
                console.warn('parsing failed', e)
                parts.tree = undefined
                parts.patternHasError = true
            }
        },
        handleTextsChange: function(parts) {
            var didChange = false
            if (this.state.pattern !== parts.pattern) {
                this.patternToTree(parts)
                didChange = true
            }
            if (this.state.flags !== parts.flags) {
                // TODO
                didChange = true
            }

            if (didChange) {
                hashUtil.update(parts)
                this.setState(parts)
            }
            // else don't make an unnecessary loop to hash change.
        },
        handleTextsSelect: function(patternSel) {
            this.setState({
                patternSel: patternSel
            })
        },

        handleSurfaceChange: function(x) {
            this.setState({
                patternSel: x.data.textLoc
            })
        },

        render: function() {
            return (
                <div className="controls">
                    <reactClasses.Texts
                        pattern={this.state.pattern}
                        flags={this.state.flags}
                        patternHasError={this.state.patternHasError}
                        patternSel={this.state.patternSel}
                        onChange={this.handleTextsChange}
                        onSelect={this.handleTextsSelect} />
                    <reactClasses.Surface
                        tree={this.state.tree}
                        flags={this.state.flags}
                        patternSel={this.state.patternSel}
                        onEvents={this.handleSurfaceChange} />
                </div>
            )
        }
    })
    React.render(
        <Controls />,
        document.getElementsByClassName('controls-parent')[0]
    )
})()
