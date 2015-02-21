;(function(reactClasses) {
    'use strict'

    function makeSelectableProto(proto) {
        /*
            Relays a select event to the parent component. The root `Surface`
                component will eventually receive it and process it.
        */
        proto.handleSelect = function(e) {
            var pegrexEvt
            if (e.isPegrexEvt) {
                // Then pass-thru.
                pegrexEvt = e
            } else {
                // Then `this` originated the event.
                pegrexEvt = {
                    isPegrexEvt: true,
                    textLoc: this.props.data.textLoc
                }

                // Event can come from a click on a transparent element.
                // If so, prevent elements behind it from firing more click events.
                e.stopPropagation()
            }
            this.props.onBubbleUpSelect(pegrexEvt)
        }
        /*
            Determines if this compo is (1) selectable and (2) selected, based on
                the current mode, the current selected portion of the pattern string,
                and the span of text that this compo is associated with.
            Expresses these properties on the DOM, on this.refs.hiliteElm.
        */
        proto.hiliteSelected = function() {
            // `filter` attr is not supported by react, so manually assign.
            if (! this.refs.hiliteElm) {
                return
            }

            var mode = this.props.patternEditorMode
            var patternSel = this.props.patternSel
            var textLoc = this.props.data.textLoc

            var textHasLen = textLoc
                && textLoc[0] != textLoc[1]

            var amSelectable = mode
                && (mode === 'add') !== textHasLen

            var amSelected = patternSel
                && textHasLen
                && patternSel[0] <= textLoc[0]
                && patternSel[1] >= textLoc[1]

            var rootElm = this.getDOMNode()
            rootElm.classList[amSelectable ? 'add' : 'remove']('selectable')

            var hiliteElm = this.refs.hiliteElm.getDOMNode()
            if (amSelected) {
                hiliteElm.setAttribute('filter', "url(#dropshadow)")
            } else {
                hiliteElm.removeAttribute('filter')
            }
        }
        /*
            If `this` component is associated with a span of the pattern string,
                then register `this`'s root element with `onClick={this.handleSelect}`
                so clicking anywhere in the root element triggers selection.
        */
        proto.componentDidMount = function() {
            if (this.props.data.textLoc) {
                var rootElm = this.getDOMNode()
                rootElm.addEventListener('click', this.handleSelect)
                this.hiliteSelected()
            }
        }
        return proto
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
            whatever surfaceData.getChildVal(data) reads in order to get children
            data.ui
                .textBlocks
    */
    var boxedClass = React.createClass(makeSelectableProto({
        render: function() {
            var self = this
            var data = this.props.data
            var patternSel = this.props.patternSel

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
                surfaceData.getChildVal(data) || [],
                data.ui.textBlocks || [],
            ].map(function(childVal) {
                var childList = ([].concat(childVal))
                    .map(function(childData, i) {
                        return createNested(self, childData, i)
                    })
                return childList
            })

            this.hiliteSelected()

            // data-type for aiding with debugging only; not used by program.
            return (
                <g transform={txform} data-type={data.type}>
                    {boxCompo}
                    {childCompos}
                </g>
            )
        }
    }))
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
            below: UI-scoped types that do not come from parser
            They use makeSelectableProto so as to not disrupt underlying elements'
                selectability.
        */

        'textBlock': React.createClass(makeSelectableProto({
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
        })),

        /*
            in this.props.path: {
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
                usesMarkerMid: optional bool, default false
                stroke: optional, default surfaceData.neighborArrowColor
            }
        */
        'path': React.createClass(makeSelectableProto({
            render: function() {
                var data = this.props.data
                var segms = data.d
                var usesMarkerEnd = data.usesMarkerEnd !== false
                var usesMarkerMid = data.usesMarkerMid

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
                            markerMid={usesMarkerMid ? 'url(#marker-mid-cross)' : null}
                            stroke={data.stroke || surfaceData.neighborArrowColor}
                            fill="none" />
                    </g>
                )
            }
        }))
    }

    function createNested(parentCompo, childData, key) {
        if (! parentCompo.handleSelect) {
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
            onBubbleUpSelect: parentCompo.handleSelect,
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
            onSelect: required
            patternSel: optional
            patternEditorMode: optional
        }
    */
    var Surface = React.createClass({
        /* fn must be named handleSelect to work with `createNested` */
        handleSelect: function(pegrexEvt) {
            this.props.onSelect(pegrexEvt.textLoc)
        },
        render: function() {
            var tree = this.props.tree

            var svgDim = [0,0]
            var childCompo
            if (tree) {
                svgDim = tree.ui.surfaceDim
                childCompo = createNested(this, tree)
            }

            var markerEndArrow = '\
                <marker id="marker-end-arrow" \
                    viewBox="0 0 10 10" refX="0" refY="5" markerWidth="{0}" markerHeight="{0}" orient="auto" fill="{1}"> \
                    <path d="M 0 0 L 10 5 L 0 10 z" /> \
                </marker>'
                    .replace(/\{0\}/g, surfaceData.markerLen)
                    .replace(/\{1\}/g, surfaceData.neighborArrowColor)
            var markerMidCross = '\
                <marker id="marker-mid-cross" \
                    viewBox="0 0 10 10" refX="5" refY="5" markerWidth="{0}" markerHeight="{0}" orient="auto" fill="none" stroke="{1}"> \
                    <path d="M 0 0 L 10 10 L 5 5 L 10 0 L 0 10" /> \
                </marker>'
                    .replace(/\{0\}/g, surfaceData.markerLen)
                    .replace(/\{1\}/g, surfaceData.neighborArrowColor)
            var dropshadow = '\
                <filter id="dropshadow" height="180%" width="180%"> \
                    <feGaussianBlur in="SourceAlpha" stdDeviation="3"/> \
                    <feOffset dx="2" dy="2" result="offsetblur"/> \
                    <feFlood flood-color="red"/> \
                    <feComposite in2="offsetblur" operator="in"/> \
                    <feMerge> \
                        <feMergeNode/> \
                        <feMergeNode in="SourceGraphic"/> \
                    </feMerge> \
                </filter>'

            return (
                <div className="surface-parent">
                    <svg width={svgDim[0]} height={svgDim[1]}
                        data-mode={this.props.patternEditorMode}>
                        <defs dangerouslySetInnerHTML={{
                            __html: markerEndArrow + markerMidCross + dropshadow
                        }}></defs>
                        {childCompo}
                    </svg>
                </div>
            )
        }
    })

    reactClasses.Surface = Surface
})(window.reactClasses = window.reactClasses || {})
