;(function(reactClasses) {
    'use strict'

    function extendClassProto(proto) {
        /*
            Single handler for all events.
            Any element should bind all events to this handler.
            The single handler fn is passed down elements as `onEvents={this.bubbleUpEvent}`
                as long as all nested children are created by the helper `createInstance`.
        */
        proto.bubbleUpEvent = function(e) {
            var payload = e.pegrexEvt
                ? e // pass-thru
                : {
                    pegrexEvt: true,
                    data: this.props.data,
                    e: e
                } // `this` originated the event
            this.props.onEvents(payload)
        }
        /*
            How highlight works:
            1. Some random surface node anywhere has `onClick={this.bubbleUpEvent}` assigned,
                which is the `proto.bubbleUpEvent` above.
            2. `bubbleUpEvent` bubbles up that surface Element's `this.props.data`.
            3. React classes are externally wired so that if `data.textLoc` exists,
                it updates `this.props.patternSel` on all surface Elements;
                hence `this.render` of all surface Elements are called.
            4. The current surface Element's `this.render` calls `this.hiteliteSelected`,
                which is the `proto.hiliteSelected` here.
            5. `hiliteSelected` matches the current Element's `this.props.textLoc` against
                the updated `this.props.patternSel`.
            6. If it's a match, `hiliteSelected` visually indicates so by
                visually modifying `this.refs.box.getDOMNode()`.

            Tl;dr
            1. (Element has a DOM node with `onClick={this.bubbleUpEvent}`)
                + (Element's proto was extended by `extendClassProto`)
                + (always using `createInstance` to create children Elements)
                = the `onClick` node can trigger highlighting by click.
            2. Write `this.render` to call `this.hiliteSelected` if `this.refs.box` is a valid ref.
        */
        proto.hiliteSelected = function() {
            // `filter` attr is not supported by react, so manually assign.
            if (! this.refs.box) {
                // component hasn't mounted.
                return
            }
            var patternSel = this.props.patternSel
            var textLoc = this.props.data.textLoc

            var amSelected = patternSel && textLoc
                && patternSel[0] <= textLoc[0]
                && patternSel[1] >= textLoc[1]
            var box = this.refs.box.getDOMNode()
            if (amSelected) {
                box.setAttribute('filter', "url(#dropshadow)")
            } else {
                box.removeAttribute('filter')
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
            // The creation of these children elements are delegated to `createInstance`,
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
    var boxedClass = React.createClass(extendClassProto({
        render: function() {
            var bubbleUpEvent = this.bubbleUpEvent
            var data = this.props.data
            var patternSel = this.props.patternSel

            var txform = ['translate(', data.ui.pos, ')'].join('')

            var boxElm = (
                <rect width={data.ui.dim[0]} height={data.ui.dim[1]} rx="3" ry="3"
                        stroke={data.ui.stroke}
                        strokeWidth={data.ui.strokeW || 3}
                        fill={data.ui.fill || 'white'}
                        onClick={bubbleUpEvent} className="clickable"
                        ref="box" />
            )

            /*
                val is [
                    [children from one property]
                ]
                I think this is better for key management than having one big array?
            */
            var childElms = [
                data.ui.fillers || [],
                data.ui.neighborArrows || [],
                surfaceData.getChildVal(data) || [],
                data.ui.textBlocks || [],
            ].map(function(childVal) {
                var childList = ([].concat(childVal))
                    .map(function(childData, i) {
                        return createInstance(bubbleUpEvent, childData, patternSel, i)
                    })
                return childList
            })

            this.hiliteSelected()

            // data-type for aiding with debugging only; not used by program.
            return (
                <g transform={txform} data-type={data.type}>
                    {boxElm}
                    {childElms}
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

        'textBlock': React.createClass(extendClassProto({
            render: function() {
                var data = this.props.data
                var bubbleUpEvent = this.bubbleUpEvent

                var txform = ['translate(', data.pos, ')'].join('')

                var textNodes = data.rows.map(function(row, i) {
                    return (
                        <text x={row.anchorPos[0]} y={row.anchorPos[1]} textAnchor={row.anchor}
                            fontFamily="monospace"
                            onClick={bubbleUpEvent} className="clickable"
                            key={i}>
                            {row.text}
                        </text>
                    )
                })

                return (
                    <g transform={txform}>
                        {textNodes}
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
        'path': React.createClass({
            render: function() {
                // TODO test
                var data = this.props.data
                var segms = data.d
                var usesMarkerEnd = data.usesMarkerEnd !== false
                var usesMarkerMid = data.usesMarkerMid

                var txform = ['translate(', (data.pos || [0,0]), ')'].join('')

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
                var pathStr = connected.join(' ')

                return (
                    <g transform={txform}>
                        <path d={pathStr}
                            markerEnd={usesMarkerEnd ? 'url(#marker-end-arrow)' : ''}
                            markerMid={usesMarkerMid ? 'url(#marker-mid-cross)' : ''}
                            stroke={data.stroke || surfaceData.neighborArrowColor}
                            fill="none" />
                    </g>
                )
            }
        })
    }
    function createInstance(bubbleUpEvent, data, patternSel, key) {
        var clazz = typeToClass[data.type] || boxedClass
        var instance = React.createElement(clazz, {
            onEvents: bubbleUpEvent,
            data: data,
            patternSel: patternSel,
            key: key
        })
        return instance
    }

    /*
        props ~= {
            onSelect: required
            tree: required
            patternSel: optional
            patternEditorMode: optional
        }
    */
    var Surface = React.createClass(extendClassProto({
        handleSelect: function(pegrexEvt) {
            this.props.onSelect(pegrexEvt.data.textLoc)
        },
        render: function() {
            var tree = this.props.tree
            var patternSel = this.props.patternSel

            var svgDim = [0,0]
            var childNode
            if (tree) {
                svgDim = tree.ui.dim
                childNode = createInstance(this.handleSelect, tree, patternSel)
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
                    <path d="M0 0 L 10 10 L 5 5 L 10 0 L 0 10" /> \
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
                        {childNode}
                    </svg>
                </div>
            )
        }
    }))

    reactClasses.boxedClass = boxedClass
    reactClasses.Surface = Surface
})(window.reactClasses = window.reactClasses || {})
