;(function(reactClasses) {
    'use strict'

    var Controls = React.createClass({
        /* states:
            pattern, tree, isPatternValid
                // Last 2 are always derived from pattern.
                // It's useful for Surface to receive tree as a prop
                //     and not be tied to pattern.
                //     See how Cell class in Palette uses Surface.
                // isPatternValid could be internalized in Texts class,
                //     but keeping it consistent with isFlagsValid.
            flags, isFlagsValid
            (hash), historyCount, rememberHistoryCount
                // Synced with pattern and flags, hash is treated as if a state.
            patternSel, selToken
                // patternSel represents user's selection range of the pattern text.
                // selToken represents user's selection of one specific token.
                // selToken is the clipboard of tokens, and hence must be kept free of
                //     non-token obj like UI data.
                // the two selections are separate concepts and hence not kept in sync.
            patternEditorMode
            hoverToken
        */
        getInitialState: function() {
            var state = reactClasses.hashUtil.parse() || {
                pattern: '^\\ty[pe] (he\\re).$',
                flags: ''
            }
            this.prepStateForTextsChange(state)
            state.patternEditorMode = 'select'
            state.historyCount = 0
            return state
        },
        componentDidMount: function() {
            window.addEventListener('hashchange', this.handleHashChange)
        },

        /* helpers for hash */

        /* modifies arg `newState`. caller must call setState after updateHash. */
        updateHash: function(newState, rememberPrev) {
            newState.pattern = typeof newState.pattern === 'string'
                ? newState.pattern : this.state.pattern
            newState.flags = typeof newState.flags === 'string'
                ? newState.flags : this.state.flags
            reactClasses.hashUtil.update(newState, rememberPrev)

            if (rememberPrev) {
                newState.historyCount = this.state.historyCount + 1
            } else {
                newState.historyCount = 0
            }
        },

        /* helpers for texts change */

        patternToTree: function(parts) {
            try {
                parts.tree = parser.parse(parts.pattern)
                surfaceData.setUiData(parts.tree)
                parts.isPatternValid = true
            } catch(e) {
                console.warn('parsing failed', e.stack)
                parts.tree = undefined
                parts.isPatternValid = false
            }
        },
        validateFlags: function(parts) {
            // The major browsers want 0..1 of each of 3 flags.
            var set = {}
            var isValid = parts.flags.split('').every(function(flag) {
                if (! /[gim]/.test(flag)) { return false }
                if (set[flag]) { return false }
                set[flag] = true
                return true
            })
            parts.isFlagsValid = isValid
        },
        /* returns undefined if no texts change occurred. */
        prepStateForTextsChange: function(newState) {
            var didChange = false
            if (this.state && this.state.pattern === newState.pattern) {
                delete newState.pattern
            } else {
                this.patternToTree(newState)
                newState.patternSel = null // do not force cursor/selection to stay in the same location
                newState.selToken = null // selToken doesn't need to be cleared if it's on palette,
                    // but that would require adding another state to keep track of it.
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

        handleHashChange: function() {
            var parts = reactClasses.hashUtil.parse()
            var newState = this.prepStateForTextsChange(parts)
            if (newState) {
                if (this.state.rememberHistoryCount) {
                    newState.rememberHistoryCount = false
                } else {
                    newState.historyCount = 0
                }
                this.setState(newState)
            }
        },

        /* events from texts */

        handleTextsChange: function(parts) {
            var newState = this.prepStateForTextsChange(parts)
            if (newState) {
                this.updateHash(newState)
                this.setState(newState)
            }
        },
        handlePatternTextSelect: function(patternSel) {
            this.setState({
                patternSel: patternSel
            })
        },

        /* events from surface */

        handleSurfaceSelect: function(token) {
            var textLoc = token.textLoc

            var mode = this.state.patternEditorMode
            var newState

            if (mode === 'select') {
                newState = {
                    patternSel: textLoc
                }
                if (token.type) {
                    newState.selToken = token
                }
                this.setState(newState)
                return
            }

            function spliceStr(str, range, replacement) {
                return str.slice(0, range[0])
                    + (replacement || '')
                    + str.slice(range[1])
            }
            var selTokenText
            if(mode === 'add') {
                if (this.state.selToken && textLoc) {
                    selTokenText = tokenCreator.toString(this.state.selToken)
                    newState = {
                        pattern: spliceStr(
                            this.state.pattern, textLoc, selTokenText),
                        patternSel: [textLoc[0],
                            textLoc[0] + selTokenText.length]
                    }
                    // note, by not clearing selToken, the previously selected token
                    //     continues to be available for add/repl/pasting. But it
                    //     can no longer be shown as selected, since the exact token
                    //     obj is no longer being rendered.
                }
            } else if(mode === 'delete') {
                if (textLoc) {
                    newState = {
                        pattern: spliceStr(
                            this.state.pattern, textLoc),
                        patternSel: [textLoc[0], textLoc[0]]
                    }
                }
            }
            if (newState) {
                this.patternToTree(newState)
                this.updateHash(newState, true)
                this.setState(newState)
            }
        },
        handleSurfaceHover: function(token, hoveringIn) {
            this.setState({
                hoverToken: hoveringIn ? token : null
            })
        },

        /* events from editors */

        handleFlagsEditorChange: function(flags) {
            var newState = {
                flags: flags
            }
            this.validateFlags(newState)
            this.updateHash(newState)
            this.setState(newState)
        },

        handlePatternEditorModeChange: function(mode) {
            this.setState({
                patternEditorMode: mode
            })
        },
        handlePatternEditorUndo: function() {
            this.setState({
                rememberHistoryCount: true,
                historyCount: this.state.historyCount - 1
            })
            window.history.back()
        },

        handlePatternEditorSelect: function(selToken) {
            this.setState({
                selToken: selToken
            })
        },

        render: function() {
            return (
                <div className="controls-parent">
                    <div className="texts-parent-parent">
                        {/* texts-parent-parent exists purely for styling
                            so we can use padding rather than margin */}
                        <reactClasses.Texts
                            pattern={this.state.pattern}
                            flags={this.state.flags}
                            isPatternValid={this.state.isPatternValid}
                            isFlagsValid={this.state.isFlagsValid}
                            patternSel={this.state.patternSel}
                            onChange={this.handleTextsChange}
                            onPatternSelect={this.handlePatternTextSelect} />
                    </div>
                    <div className="visuals-parent">
                        <reactClasses.Surface
                            tree={this.state.tree}
                            patternSel={this.state.patternSel}
                            patternEditorMode={this.state.patternEditorMode}
                            onSelect={this.handleSurfaceSelect}
                            onHover={this.handleSurfaceHover}
                            isMainSurface={true} />
                        <reactClasses.FlagsEditor
                            flags={this.state.flags}
                            isFlagsValid={this.state.isFlagsValid}
                            onChange={this.handleFlagsEditorChange} />
                        <reactClasses.PatternEditorModePicker
                            patternEditorMode={this.state.patternEditorMode}
                            historyCount={this.state.historyCount}
                            onChange={this.handlePatternEditorModeChange}
                            onUndo={this.handlePatternEditorUndo} />
                        <reactClasses.Hint 
                            selToken={this.state.selToken}
                            hoverToken={this.state.hoverToken} />
                    </div>
                    <reactClasses.PatternEditor
                        selToken={this.state.selToken}
                        onSelect={this.handlePatternEditorSelect} />
                </div>
            )
        }
    })
    reactClasses.Controls = Controls

})(window.reactClasses = window.reactClasses || {})
