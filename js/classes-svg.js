;(function(reactClasses) {
    'use strict'

    function extend(proto) {
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

    var Surface = React.createClass(extend({
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
                    .replace(/\{0\}/g, reactClasses.markerLen)
                    .replace(/\{1\}/g, reactClasses.markerColor)
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

    // TODO css
    /*
        staticParams ~= {
            childProp: optional
            moreChildElms: optional
        }
    */
    function createBoxedClass(staticParams) {
        return React.createClass(extend({
            checkSelected: function() {
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
                            stroke={staticParams.stroke}
                            strokeWidth={staticParams.strokeW}
                            fill={staticParams.fill || 'white'}
                            onClick={this.handleEvents} className="clickable"
                            ref="box" />
                )

                // val is array of arrays
                var childElms =
                    // in the increasing order of z-index ...
                    (data.ui.fillers || [])
                    .concat(data.ui.arrows || [])
                    .concat(data[staticParams.childProp] || [])
                    .map(function(childVal) {
                        var childList = ([].concat(childVal))
                            .map(function(childData, i) {
                                return createInstance(handleEvents, childData, patternSel, i)
                            })
                        return childList
                    })

                // additional nodes will go on top of everything else
                var moreChildElms = staticParams.moreChildElms
                    ? staticParams.moreChildElms.call(this, data)
                    : null

                this.checkSelected()

                return (
                    <g transform={txform}>
                        {boxElm}
                        {childElms}
                        {moreChildElms}
                    </g>
                )
            }
        }))
    }
    var typeToClass = {
        'Pattern': createBoxedClass({
            stroke: 'none',
            fill: 'none',
            childProp: 'roots'
        }),
        'Terminus': React.createClass({
            render: function() {
                var ui = this.props.data.ui

                var txform = ['translate(', ui.pos, ')'].join('')

                return (
                    <g transform={txform}>
                        <circle cx={ui.cx} cy={ui.cy} r={ui.r} />
                    </g>
                )
            }
        }),
        'Disjunction': createBoxedClass({
            stroke: 'none',
            fill: 'none',
            childProp: 'alternatives'
        }),
        'Alternative': createBoxedClass({
            stroke: 'none',
            fill: 'none',
            childProp: 'terms'
        }),
        'Quantified': createBoxedClass({
            stroke: '#7a0',
            strokeW: 3,
            childProp: 'target'
        }),
        'Group': createBoxedClass({
            stroke: '#fb5',
            strokeW: 3,
            childProp: 'grouped'
        }),
        'Set of Chars': createBoxedClass({
            stroke: '#b7a',
            strokeW: 3,
            childProp: 'possibilities'
        }),
        'Range of Chars': createBoxedClass({
            stroke: '#f77',
            strokeW: 2,
            childProp: 'range'
        }),
        'TextsOnly': createBoxedClass({
            stroke: '#09d',
            strokeW: 2,
            moreChildElms: function(data) {
                var handleEvents = this.handleEvents
                return data.ui.rows.map(function(row, i) {
                    return (
                        <text x={row.pos[0]} y={row.pos[1]} textAnchor={row.anchor}
                            fontFamily="monospace" key={i} onClick={handleEvents}
                            className="clickable">
                            {row.text}
                        </text>
                    )
                })
            }
        }),

        'path': React.createClass(extend({
            render: function() {
                // TODO test
                /* in this.props.path: {
                        d: required -- array of (strings or [n,n]).
                            If using marker, last element must be [n,n], b/c it will be adjusted.
                            All coords are absolute.
                            Segments in d are connected by...
                                * -> (nothing) -> string
                                coord -> quadratic bezier -> coord
                                string -> straight line -> coord
                        pos: optional [n,n], default [0,0]
                        isVertical: optional bool, default false
                        usesMarker: optional bool, default true
                        markerColor: optional
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
                        end[data.isVertical ? 1 : 0] -= reactClasses.markerLen
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
                            return reactClasses.utils.reflectedQuadra(segms[i - 1], segm, data.isVertical)
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

                var markerEnd = usesMarker ? 'url(#marker-tri)' : ''

                var stroke = data.markerColor || reactClasses.markerColor

                return (
                    <g transform={txform}>
                        <path d={pathStr} markerEnd={markerEnd} stroke={stroke} fill="none" />
                    </g>
                )
            }
        }))
    }
    function createInstance(handleEvents, data, patternSel, key) {
        var aliases = {
            'Any Char': 'TextsOnly',
            'Specific Char': 'TextsOnly',
            'Reference': 'TextsOnly',
            'Assertion': 'TextsOnly'
        }
        var clazz = typeToClass[data.type]
            || typeToClass[aliases[data.type]]
        if (! clazz) {
            console.error('could not find the react type for data', data)
        }
        var instance = React.createElement(clazz, {
            onEvents: handleEvents,
            data: data,
            patternSel: patternSel,
            key: key
        })
        return instance
    }

    reactClasses.Surface = Surface
})(window.reactClasses = window.reactClasses || {})
