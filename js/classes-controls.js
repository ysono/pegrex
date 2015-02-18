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
            this.prepStateForTextsChange(state)
            state.patternEditorMode = 'select'
            return state
        },
        componentDidMount: function() {
            window.addEventListener('hashchange', this.handleHashChange)
        },

        /* helpers for hash */

        updateHash: function(newState) {
            newState.pattern = typeof newState.pattern === 'string'
                ? newState.pattern : this.state.pattern
            newState.flags = typeof newState.flags === 'string'
                ? newState.flags : this.state.flags
            hashUtil.update(newState)
        },

        /* helpers for texts change */

        patternToTree: function(parts) {
            try {
                parts.tree = parser.parse(parts.pattern)
                surfaceData.addUiData(parts.tree)
                parts.isPatternValid = true
            } catch(e) {
                console.warn('parsing failed', e)
                parts.tree = undefined
                parts.isPatternValid = false
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
            parts.isFlagsValid = isValid
        },
        /* for optimization, reads from state: pattern, flag */
        /* returns undefined if no texts change occurred. */
        prepStateForTextsChange: function(newState) {
            var didChange = false
            if (this.state && this.state.pattern === newState.pattern) {
                delete newState.pattern
            } else {
                this.patternToTree(newState)
                newState.patternSel = null // do not force cursor/selection to stay in the same location
                didChange = true
            }
            if (this.state && this.state.flags === newState.flags) {
                delete newState.flags
            } else {
                this.validateFlags(newState)
                didChange = true
            }

            if (didChange) {
                return newState
            }
        },

        /* events from hash */

        /* sets in state: (pattern, tree, isPatternValid), (flags, isFlagsValid), patternSel */
        handleHashChange: function() {
            var parts = hashUtil.parse()
            var newState = this.prepStateForTextsChange(parts)
            if (newState) {
                this.setState(newState)
            }
        },

        /* events from texts */

        /* sets in state: pattern, tree, isPatternValid, flags, isFlagsValid, patternSel, hash */
        handleTextsChange: function(parts) {
            var newState = this.prepStateForTextsChange(parts)
            if (newState) {
                this.updateHash(newState)
                this.setState(newState)
            }
        },
        /* sets in state: patternSel */
        handleTextsSelect: function(patternSel) {
            this.setState({
                patternSel: patternSel
            })
        },

        /* events from surface */

        /* reads from state: patternEditorMode */
        /* in select mode, sets in state: patternSel */
        /* in delete mode, reads from state: pattern
            sets in state: pattern, tree, isPatternValid, patternSel, hash */
        handleSurfaceSelect: function(textLoc) {
            // handles all events. handle different types here.
            var mode = this.state.patternEditorMode
            if (mode === 'select') {
                this.setState({
                    patternSel: textLoc
                })
            } else if(mode === 'delete') {
                if (textLoc) {
                    ;(function() {
                        function spliceStr(from, to) {
                            var arr = this.split('')
                            arr.splice(from, to - from)
                            return arr.join('')
                        }
                        var newState = {
                            pattern: spliceStr.apply(
                                this.state.pattern, textLoc),
                            patternSel: [textLoc[0], textLoc[0]]
                        }
                        this.patternToTree(newState)
                        this.updateHash(newState)
                        this.setState(newState)
                    }).bind(this)()
                }
            }
        },

        /* events from editors */

        /* sets in state: flags, isFlagsValid, hash */
        handleFlagsEditorChange: function(flags) {
            var newState = {
                flags: flags
            }
            this.validateFlags(newState)
            this.updateHash(newState)
            this.setState(newState)
        },

        /* sets in state: patternEditorMode */
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
                        isPatternValid={this.state.isPatternValid}
                        isFlagsValid={this.state.isFlagsValid}
                        patternSel={this.state.patternSel}
                        onChange={this.handleTextsChange}
                        onSelect={this.handleTextsSelect} />
                    <div className="visuals-parent">
                        <reactClasses.Surface
                            tree={this.state.tree}
                            flags={this.state.flags}
                            patternSel={this.state.patternSel}
                            patternEditorMode={this.state.patternEditorMode}
                            onSelect={this.handleSurfaceSelect} />
                        <reactClasses.FlagsEditor
                            flags={this.state.flags}
                            isFlagsValid={this.state.isFlagsValid}
                            onChange={this.handleFlagsEditorChange} />
                        <reactClasses.PatternEditorModePicker
                            patternEditorMode={this.state.patternEditorMode}
                            onChange={this.handlePatternEditorModeChange} />
                    </div>
                    <div className="pattern-editor-parent">
                        <reactClasses.PatternEditor />
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
