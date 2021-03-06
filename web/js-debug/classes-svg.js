;(function(reactClasses) {
    'use strict'

    var selectableMixin = {
        /*
            Relays any kind of events to the parent component. The root `Surface`
                component will eventually receive it and process it.
        */
        handleEvents: function(e) {
            var pegrexEvt
            if (e.isPegrexEvt) {
                // Then pass-thru.
                pegrexEvt = e
            } else {
                // Then `this` originated the event.
                pegrexEvt = {
                    isPegrexEvt: true,
                    data: this.props.data,
                    type: e.type
                }

                // Event can come from a click on a transparent element.
                // If so, prevent elements behind it from firing more click events.
                e.stopPropagation()
            }
            this.props.onBubbleUpEvents(pegrexEvt)
        },
        /*
            Determines if this compo is (1) selectable and (2) selected, based on
                the current mode, the current selected portion of the pattern string,
                and the span of text that this compo is associated with.
            Expresses these properties on the DOM, on this.refs.hiliteElm.
        */
        hiliteSelected: function() {
            if (! this.refs.hiliteElm || ! this.props.data.textLoc) {
                return
            }
            var mode = this.props.patternEditorMode
            var patternSel = this.props.patternSel
            var textLoc = this.props.data.textLoc
            var type = this.props.data.type

            var textHasLen = textLoc
                && textLoc[0] != textLoc[1]

            var amSelectable = {
                'select': type && type[0] <= 'Z',
                    // whether data is a parser token. Relies on the case convention.
                'add': !! textLoc,
                'delete': textHasLen
            }[mode]
            var amSelectedByTextRange = patternSel && textHasLen
                && patternSel[0] <= textLoc[0]
                && patternSel[1] >= textLoc[1]

            var hiliteElm = this.refs.hiliteElm.getDOMNode()

            // ie-safe toggle
            if (hiliteElm.classList &&
                hiliteElm.classList.contains('selectable') !== amSelectable) {
                hiliteElm.classList.toggle('selectable')
            }
            function handleEvt(elm, type, handler) {
                elm[(amSelectable ? 'add' : 'remove') + 'EventListener'](type, handler)
            }
            handleEvt(hiliteElm, 'click', this.handleEvents)
            handleEvt(hiliteElm, 'mouseenter', this.handleEvents)
            handleEvt(hiliteElm, 'mouseleave', this.handleEvents)

            // note: filter attr is not supported by react, so have to use js anyway.
            if (amSelectedByTextRange) {
                hiliteElm.setAttribute('filter', 'url(#dropshadow-sel-by-text-range)')
            } else {
                hiliteElm.removeAttribute('filter')
            }
        },

        componentDidMount: function() {
            var rootElm = this.getDOMNode()
            rootElm.setAttribute('data-type', this.props.data.type)
            this.hiliteSelected()
        },
        componentDidUpdate: function() {
            this.hiliteSelected()
        }
    }

    /*
        boxedClass's render fn reads following vals. All are optional unless noted.
        In the increasing order of z-index ...
            // for rect
            data.ui
                .pos // required
                .dim // required
                .fill // default 'white' so it can hide neighborArrows underneath
                .stroke
                .strokeW // default 3. if zero, use stroke='none'

            // for other children
            // The creation of these children components are delegated to `createNested`,
            //     so they each must have valid `.type`.
            // The separation of props is for convenience while adding ui data;
            //     render fn does not care which types of children are in which props.
            data.ui
                .fillers
                .neighborArrows
            whatever surfaceData.getChildTokens(data) reads in order to get children
            data.ui
                .textBlocks
    */
    var boxedClass = React.createClass({
        mixins: [selectableMixin],
        render: function() {
            var self = this
            var data = this.props.data

            var txform = ['translate(', data.ui.pos, ')'].join('')

            var boxCompo = (
                <rect width={data.ui.dim[0]} height={data.ui.dim[1]} rx="3" ry="3"
                        stroke={data.ui.stroke}
                        strokeWidth={data.ui.strokeW || 3}
                        fill={data.ui.fill || 'white'}
                        ref="hiliteElm" />
            )

            /*
                val is [
                    [children from one property]
                ]
                I think this is better for key management than having one big array?
            */
            var childCompos = [
                data.ui.fillers || [],
                data.ui.neighborArrows || [],
                surfaceData.getChildTokens(data) || [],
                data.ui.textBlocks || [],
            ].map(function(childVal) {
                var childList = ([].concat(childVal))
                    .map(function(childData, i) {
                        return createNested(self, childData, i)
                    })
                return childList
            })

            return (
                <g transform={txform}>
                    {boxCompo}
                    {childCompos}
                </g>
            )
        }
    })
    var typeToClass = {
        'Terminus': React.createClass({
            render: function() {
                var ui = this.props.data.ui

                var txform = ['translate(', ui.pos, ')'].join('')

                return (
                    <g transform={txform}>
                        <circle cx={ui.cx} cy={ui.cy} r={ui.r} fill={ui.fill} />
                    </g>
                )
            }
        }),

        /*
            below: UI-only types that do not come from parser.
            Important: hiliteSelected depends on the convention of
                starting UI-only types with lower case.
        */

        // make textBlock selectable to prevent flicker of mouse cursor
        'textBlock': React.createClass({
            mixins: [selectableMixin],
            render: function() {
                var data = this.props.data

                var txform = ['translate(', data.pos, ')'].join('')

                var textCompos = data.rows.map(function(row, i) {
                    return (
                        <text x={row.anchorPos[0]} y={row.anchorPos[1]} textAnchor={row.anchor}
                            fontFamily="monospace"
                            key={i}>
                            {row.text}
                        </text>
                    )
                })

                return (
                    <g transform={txform}>
                        {textCompos}
                    </g>
                )
            }
        }),

        /*
            Make a path with a box around it that can be selectable.

            In addition to those required for 'path' class,
            these props are required inside this.props.data: {
                pos: [n,n]
                dim: [n,n]
            }
        */
        'boxed path': React.createClass({
            mixins: [selectableMixin],
            render: function() {
                var data = this.props.data

                var txform = ['translate(', data.pos, ')'].join('')

                var pathData = Object.create(data)
                pathData.pos = null

                return (
                    <g transform={txform}>
                        <rect width={data.dim[0]} height={data.dim[1]}
                            fill="none"
                            ref="hiliteElm" />
                        <typeToClass.path data={pathData} />
                    </g>
                )
            }
        }),

        /*
            in this.props.data: {
                d: required -- array of (strings or [n,n]).
                    If using marker, last element must be [n,n], b/c it will be adjusted.
                    All coords are absolute.
                    Segments in d are connected by...
                        nothing between (* -> string)
                        quadratic bezier between (coord -> coord)
                        straight line between (string -> coord)
                pos: optional [n,n], default [0,0]
                isVertical: optional bool, default false
                usesMarkerEnd: optional bool, default true
                stroke: optional, default surfaceData.neighborArrowColor
            }
        */
        'path': React.createClass({
            render: function() {
                var data = this.props.data
                var segms = data.d
                var usesMarkerEnd = data.usesMarkerEnd !== false

                var txform = ['translate(', (data.pos || [0,0]), ')'].join('')

                var dStr = (function() {
                    if (usesMarkerEnd) {
                        ;(function() {
                            // Make adjustment for marker here, just before drawing, so that whether a marker
                            // is used at the end can be adjusted while finalizing surface data.

                            var end = segms.slice(-1)[0]
                            if (! (end instanceof Array)) {
                                console.warn('could not adjust path for marker. make sure last item is a coord.', data)
                                return
                            }
                            segms = segms.slice() // clone so marker adjustment does not survive re-rendering
                            end = end.slice()
                            segms.splice(-1, 1, end)
                            end[data.isVertical ? 1 : 0] -= surfaceData.markerLen
                        })()
                    }

                    var connected = segms.reduce(function(connected, segm, i) {
                        var next = (function() {
                            if (typeof segm === 'string') {
                                // (coord or string or beginning of array) followed by string
                                return segm
                            }
                            if (segms[i - 1] instanceof Array) {
                                // coord followed by coord
                                return surfaceData.reflectedQuadra(segms[i - 1], segm, data.isVertical)
                            }
                            if (i) {
                                // string followed by coord
                                return ['L', segm]
                            }
                            // beginning of array followed by coord
                            return ['M', segm]
                        })()
                        return connected.concat(next)
                    }, [])
                    return connected.join(' ')
                })()

                return (
                    <g transform={txform}>
                        <path d={dStr}
                            markerEnd={usesMarkerEnd ? 'url(#marker-end-arrow)' : null}
                            stroke={data.stroke || surfaceData.neighborArrowColor}
                            fill="none" />
                    </g>
                )
            }
        })
    }

    function createNested(parentCompo, childData, key) {
        if (! parentCompo.handleEvents) {
            console.error('Cannot nest', parentCompo.props, childData)
            throw [
                'Because the parent component is not equipped to relay',
                'the chaing of bubbled up select events, the child component',
                'will not be selectable. While this is technically sensible,',
                'it is not expected in this app, so something is wired wrong.'
            ].join('')
        }
        var clazz = typeToClass[childData.type] || boxedClass
        var instance = React.createElement(clazz, {
            onBubbleUpEvents: parentCompo.handleEvents,
            data: childData,
            patternSel: parentCompo.props.patternSel,
            patternEditorMode: parentCompo.props.patternEditorMode,
            key: key
        })
        return instance
    }

    /*
        props ~= {
            tree: required
            
            onHover: optional

            patternSel // required if highlighting by text selection is to be enabled.

            // both are required iff selection is to be enabled
            patternEditorMode
            onSelect
        }
    */
    var Surface = React.createClass({
        handleEvents: function(pegrexEvt) {
            if (pegrexEvt.type === 'click') {
                this.props.onSelect(pegrexEvt.data)
            } else {
                this.props.onHover &&
                this.props.onHover(pegrexEvt.data, pegrexEvt.type === 'mouseenter')
            }
        },
        render: function() {
            var tree = this.props.tree

            var svgDim = [0,0]
            var childCompo
            if (tree) {
                svgDim = tree.ui.surfaceDim
                childCompo = createNested(this, tree)
            }

            return (
                <div className="surface-parent">
                    <svg width={svgDim[0]} height={svgDim[1]}
                        data-mode={this.props.patternEditorMode}
                        id={this.props.isMainSurface ? 'main-surface' : null}>
                        {this.props.isMainSurface ? <SurfaceMetadata /> : null}
                        {childCompo}
                    </svg>
                </div>
            )
        }
    })

    var SurfaceMetadata = React.createClass({
        render: function() {
            var markerEndArrow = '\
                <marker id="marker-end-arrow" \
                    viewBox="0 0 10 10" refX="0" refY="5" markerWidth="{0}" markerHeight="{0}" orient="auto" fill="{1}"> \
                    <path d="M 0 0 L 10 5 L 0 10 z" /> \
                </marker>'
                    .replace(/\{0\}/g, surfaceData.markerLen)
                    .replace(/\{1\}/g, surfaceData.neighborArrowColor)
            
            var dropShadowTemplate = '\
                <filter id="{0}" height="180%" width="180%"> \
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/> \
                    <feOffset dx="2" dy="2" result="offsetblur"/> \
                    <feFlood flood-color="{1}"/> \
                    <feComposite in2="offsetblur" operator="in"/> \
                    <feMerge> \
                        <feMergeNode/> \
                        <feMergeNode in="SourceGraphic"/> \
                    </feMerge> \
                </filter>'
            var dropShadowSelByTextRange = dropShadowTemplate
                .replace(/\{0\}/g, 'dropshadow-sel-by-text-range')
                .replace(/\{1\}/g, 'red')
            return (
                <defs dangerouslySetInnerHTML={{
                    __html: markerEndArrow + dropShadowSelByTextRange
                }}></defs>
            )
        }
    })

    reactClasses.Surface = Surface
})(window.reactClasses = window.reactClasses || {})
