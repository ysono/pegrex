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
            this.validateFlags(state)
            state.patternSel = null // will be [n,n] - beg/end indices of selection.
            state.patternEditorMode = 'select'
            return state
        },
        componentDidMount: function() {
            window.addEventListener('hashchange', this.handleHashChange)
        },

        /*
            TODO add this fn
            All event handlers delegate to here, which in turn runs all relevant
                event handlers based on what was provided in the partial state.

            Therefore, the caller of `syncState` is _guaranteed_ to 
        */
        // syncState: function(partialState) {
        //     var keys = Object.keys(partialState).reduce(function(map, key) {
        //         map[key] = true
        //         return map
        //     }, {})
        //     if (partialState.pattern || partialState.flags) {
        //         hashUtil.update(partialState)
        //         this.handleTextsChange(partialState)
        //     }
        //     if (partialState.patternSel) {

        //     }
        //     this.setState(partialState)
        // },

        /* from hash */

        handleHashChange: function() {
            var parts = hashUtil.parse()
            if (parts) {
                this.handleTextsChange(parts)
            }
            // this.syncState(parts)
        },

        /* from texts */

        patternToTree: function(parts) {
            try {
                parts.tree = parser.parse(parts.pattern)
                surfaceData.addUiData(parts.tree)
                parts.validPattern = true
            } catch(e) {
                console.warn('parsing failed', e)
                parts.tree = undefined
                parts.validPattern = false
            }
        },
        validateFlags: function(parts) {
            // The major browsers 0..1 of each of 3 flags.
            var set = {}
            var isValid = parts.flags.split('').every(function(flag) {
                if (! /[gim]/.test(flag)) { return false }
                if (set[flag]) { return false }
                set[flag] = true
                return true
            })
            parts.validFlags = isValid
        },
        handleTextsChange: function(parts) {
            var didChange = false
            if (this.state.pattern !== parts.pattern) {
                this.patternToTree(parts)
                didChange = true
            }
            if (this.state.flags !== parts.flags) {
                this.validateFlags(parts)
                didChange = true
            }

            if (didChange) {
                parts.patternSel = null // or else cursor/selection won't change as user types.
                hashUtil.update(parts)
                this.setState(parts)
                // this.syncState(parts)
            }
            // else don't make an unnecessary loop to hash change.
        },
        handleTextsSelect: function(patternSel) {
            this.setState({
                patternSel: patternSel
            })
        },

        /* from surface */

        handleSurfaceEvents: function(x) {
            // handles all events. handle different types here.
            // (currently all events are clicks)
            function spliceStr(from, to) {
                var arr = this.split('')
                arr.splice(from, to - from)
                return arr.join('')
            }

            var mode = this.state.patternEditorMode
            var state
            if (mode === 'select') {
                this.setState({
                    patternSel: x.data.textLoc
                })
            } else if(mode === 'delete') {
                if (x.data.textLoc) {
                    console.info('splicing', x.data.textLoc)
                    state = {
                        pattern: spliceStr.apply(
                            this.state.pattern, x.data.textLoc),
                        patternSel: [x.data.textLoc[0], x.data.textLoc[0]]
                    }
                    this.patternToTree(state)
                    hashUtil.update({
                        pattern: state.pattern,
                        flags: this.state.flags
                    })
                    this.setState(state)
                }
            }
        },

        /* from editors */

        handleFlagsEditorChange: function(flags) {
            var state = {
                flags: flags
            }
            this.validateFlags(state)
            hashUtil.update({
                pattern: this.state.pattern,
                flags: state.flags
            })
            this.setState(state)
        },

        handlePatternEditorModeChange: function(mode) {
            this.setState({
                patternEditorMode: mode
            })
        },

        render: function() {
            return (
                <div className="controls-parent">
                    <reactClasses.Texts
                        pattern={this.state.pattern}
                        flags={this.state.flags}
                        validPattern={this.state.validPattern}
                        validFlags={this.state.validFlags}
                        patternSel={this.state.patternSel}
                        onChange={this.handleTextsChange}
                        onSelect={this.handleTextsSelect} />
                    <div className="visuals-parent">
                        <reactClasses.Surface
                            tree={this.state.tree}
                            flags={this.state.flags}
                            patternSel={this.state.patternSel}
                            onEvents={this.handleSurfaceEvents} />
                        <reactClasses.FlagsEditor
                            flags={this.state.flags}
                            validFlags={this.state.validFlags}
                            onChange={this.handleFlagsEditorChange} />
                        <reactClasses.PatternEditor
                            onModeChange={this.handlePatternEditorModeChange} />
                    </div>
                </div>
            )
        }
    })
    React.render(
        <Controls />,
        document.getElementsByClassName('react-parent')[0]
    )
})()
