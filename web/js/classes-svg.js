;(function(reactClasses) {
    'use strict'

    function extendClassProto(proto) {
        proto.handleEvents = function(e) {
            var payload = e.pegrexPayload
                ? e // pass-thru
                : {
                    pegrexPayload: true,
                    data: this.props.data,
                    e: e
                } // `this` originated the event
            this.props.onEvents(payload)
        }
        return proto
    }

    /*
        render fn reads following vals. All are optional unless noted.
        In the increasing order of z-index ...
            // for rect
            data.ui
                .pos // required
                .dim // required
                .fill // default 'white' so it can hide neighborArrows underneath
                .stroke
                .strokeW // default 3. if zero, use stroke='none'

            // for decorative children
            data.ui
                .fillers
                .neighborArrows

            // for syntactically significant children
            uses surfaceData.getChildVal(data)

            // for texts
            data.ui
                .textRows
    */
    var boxedClass = React.createClass(extendClassProto({
        hiliteSelected: function() {
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
                // `filter` attr is not supported by react, so hack.
                box.setAttribute('filter', "url(#dropshadow)")
            } else {
                box.removeAttribute('filter')
            }
        },
        render: function() {
            var handleEvents = this.handleEvents
            var data = this.props.data
            var patternSel = this.props.patternSel

            var txform = ['translate(', data.ui.pos, ')'].join('')

            var boxElm = (
                <rect width={data.ui.dim[0]} height={data.ui.dim[1]}
                        stroke={data.ui.stroke}
                        strokeWidth={data.ui.strokeW || 3}
                        fill={data.ui.fill || 'white'}
                        onClick={handleEvents} className="clickable"
                        ref="box" />
            )

            var childElms =
                (data.ui.fillers || [])
                .concat(data.ui.neighborArrows || [])
                .concat(surfaceData.getChildVal(data) || [])
                .map(function(childVal) {
                    var childList = ([].concat(childVal))
                        .map(function(childData, i) {
                            return createInstance(handleEvents, childData, patternSel, i)
                        })
                    return childList
                })

            var textElms = (data.ui.textRows || [])
                .map(function(row, i) {
                    return (
                        <text x={row.pos[0]} y={row.pos[1]} textAnchor={row.anchor}
                            fontFamily="monospace" key={i}
                            onClick={handleEvents} className="clickable">
                            {row.text}
                        </text>
                    )
                })

            this.hiliteSelected()

            return (
                <g transform={txform}>
                    {boxElm}
                    {childElms}
                    {textElms}
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
        'path': React.createClass({
            render: function() {
                // TODO test
                /* in this.props.path: {
                        d: required -- array of (strings or [n,n]).
                            If using marker, last element must be [n,n], b/c it will be adjusted.
                            All coords are absolute.
                            Segments in d are connected by...
                                nothing between (* -> string)
                                quadratic bezier between (coord -> coord)
                                straight line between (string -> coord)
                        pos: optional [n,n], default [0,0]
                        isVertical: optional bool, default false
                        usesMarker: optional bool, default true
                        stroke: optional, default surfaceData.neighborArrowColor
                    }
                */
                var data = this.props.data
                var segms = data.d
                var usesMarker = data.usesMarker !== false

                var txform = ['translate(', (data.pos || [0,0]), ')'].join('')

                if (usesMarker) {
                    (function() {
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
                            return surfaceData.utils.reflectedQuadra(segms[i - 1], segm, data.isVertical)
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
                            markerEnd={usesMarker ? 'url(#marker-tri)' : ''}
                            stroke={data.stroke || surfaceData.neighborArrowColor}
                            fill="none" />
                    </g>
                )
            }
        })
    }
    function createInstance(handleEvents, data, patternSel, key) {
        var clazz = typeToClass[data.type] || boxedClass
        var instance = React.createElement(clazz, {
            onEvents: handleEvents,
            data: data,
            patternSel: patternSel,
            key: key
        })
        return instance
    }

    reactClasses.Surface = React.createClass(extendClassProto({
        render: function() {
            var tree = this.props.tree
            var patternSel = this.props.patternSel

            var svgDim = [0,0]
            var childNode
            if (tree) {
                svgDim = tree.ui.svgDim
                childNode = createInstance(this.handleEvents, tree, patternSel)
            }

            var marker = '\
                <marker id="marker-tri" \
                    viewBox="0 0 10 10" refX="0" refY="5" markerWidth="{0}" markerHeight="{0}" orient="auto" fill="{1}"> \
                    <path d="M 0 0 L 10 5 L 0 10 z" /> \
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
                    <svg width={svgDim[0]} height={svgDim[1]}>
                        <defs dangerouslySetInnerHTML={{__html: marker + dropshadow}}></defs>
                        {childNode}
                    </svg>
                </div>
            )
        }
    }))

})(window.reactClasses = window.reactClasses || {})
