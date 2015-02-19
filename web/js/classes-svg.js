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
            Compares given selection range on the pattern string against the
                span of the pattern string that `this` component is associated with.
            If the selection encompasses `this`'s span, then highlight `this`.
            Speicfically, highlight is applied to the element within `this` referred to
                by `hiliteElm`, if it exists.
        */
        proto.hiliteSelected = function() {
            // `filter` attr is not supported by react, so manually assign.
            if (! this.refs.hiliteElm) {
                return
            }
            var patternSel = this.props.patternSel
            var textLoc = this.props.data.textLoc

            var amSelected = patternSel && textLoc
                && patternSel[0] <= textLoc[0]
                && patternSel[1] >= textLoc[1]
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
                var thisRootNode = this.getDOMNode()
                thisRootNode.addEventListener('click', this.handleSelect)
                thisRootNode.classList.add('selectable')
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
            // The creation of these children components are delegated to `createInstance`,
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
                        return createNestedSelectableInstance(self, childData, i)
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

        // below: UI-scoped types that do not come from parser

        'textBlock': React.createClass({
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
        'path': React.createClass({
            render: function() {
                var data = this.props.data
                var segms = data.d
                var usesMarkerEnd = data.usesMarkerEnd !== false
                var usesMarkerMid = data.usesMarkerMid

                var txform = ['translate(', (data.pos || [0,0]), ')'].join('')

                var dStr = (function() {
                    function reflectedQuadra(from, to, isVertical) {
                        var vector = [
                            to[0] - from[0],
                            to[1] - from[1]
                        ]
                        var quadraCtrlPt
                        if (isVertical) {
                            quadraCtrlPt = [
                                from[0],
                                from[1] + vector[1] / 4
                            ]
                        } else {
                            quadraCtrlPt = [
                                from[0] + vector[0] / 4,
                                from[1]
                            ]
                        }
                        var midPt = [
                            from[0] + vector[0] / 2,
                            from[1] + vector[1] / 2
                        ]
                        return ['Q', quadraCtrlPt, midPt, 'T', to].join(' ')
                    }

                    if (usesMarkerEnd) {
                        ;(function() {
                            var end = segms.slice(-1)[0]
                            if (! (end instanceof Array)) {
                                console.warn('could not adjust path for marker. make sure last item is a coord.', data)
                                return
                            }
                            segms = segms.slice() // clone so marker adjustment does not survive refresh
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
                                return reflectedQuadra(segms[i - 1], segm, data.isVertical)
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
        })
    }
    function createInstance(handleSelect, data, patternSel, key) {
        var clazz = typeToClass[data.type] || boxedClass
        var instance = React.createElement(clazz, {
            onBubbleUpSelect: handleSelect,
            data: data,
            patternSel: patternSel,
            key: key
        })
        return instance
    }
    function createNestedSelectableInstance(parentCompo, childData, key) {
        if (! parentCompo.handleSelect) {
            console.error('Cannot nest', parentCompo.props, childData)
            throw [
                'Because the parent component is not equipped to relay',
                'the chaing of bubbled up select events, the child component',
                'will not be selectable. While this is technically sensible,',
                'it is not expected in this app, so something is wired wrong.'
            ].join('')
        }
        return createInstance(
            parentCompo.handleSelect,
            childData,
            parentCompo.props.patternSel,
            key)
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
        handleSelect: function(pegrexEvt) {
            this.props.onSelect(pegrexEvt.textLoc)
        },
        render: function() {
            var tree = this.props.tree
            var patternSel = this.props.patternSel

            var svgDim = [0,0]
            var childCompo
            if (tree) {
                svgDim = tree.ui.surfaceDim
                childCompo = createInstance(this.handleSelect, tree, patternSel)
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
