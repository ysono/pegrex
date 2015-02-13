;(function(reactClasses) {
    'use strict'

    function extend(proto) {
        proto.handleEvents = function(e) {
            var payload = e.pegrexPayload ? e
                : {
                    pegrexPayload: true,
                    data: this.props.data,
                    e: e
                }
            this.props.onEvents(payload)
        }
        return proto
    }

    var Surface = React.createClass(extend({
        render: function() {
            var tree = this.props.tree

            var svgDim = [0,0]
            var childNode
            if (tree) {
                svgDim = tree.ui.svgDim
                childNode = createInstance(this.handleEvents, tree)
            }

            var markerStr = '\
                <marker id="marker-tri" \
                    viewBox="0 0 10 10" refX="0" refY="5" markerWidth="{}" markerHeight="{}" orient="auto" fill="orange"> \
                    <path d="M 0 0 L 10 5 L 0 10 z" /> \
                </marker>'.replace(/\{\}/g, reactClasses.markerLen)
            return (
                <div className="surface-parent">
                    <svg width={svgDim[0]} height={svgDim[1]}>
                        <defs dangerouslySetInnerHTML={{__html: markerStr}}></defs>
                        {childNode}
                    </svg>
                </div>
            )
        }
    }))

    function createBoxedClass(staticParams) {
        return React.createClass(extend({
            render: function() {
                var self = this
                var data = this.props.data

                var txform = ['translate(', data.ui.pos, ')'].join('')

                var boxElm = (
                    <rect width={data.ui.dim[0]} height={data.ui.dim[1]}
                            stroke={staticParams.stroke}
                            strokeWidth={staticParams.strokeW}
                            fill={staticParams.fill || 'white'}
                            onClick={this.handleEvents} />
                )

                // list childProps in the increasing order of z index.
                // val is array of arrays
                var childElms = (staticParams.childProps || [])
                    .map(function(childProp) {
                        var childVal = childProp.split('.')
                            .filter(function(propName) {
                                return propName
                            })
                            .reduce(function(o, propName) {
                                return o[propName]
                            }, data)
                        var childList = ([].concat(childVal))
                            .map(function(childData, i) {
                                return createInstance(self.handleEvents, childData, i)
                            })
                        return childList
                    })

                // additional nodes will go on top of everything else
                var moreChildElms = staticParams.moreChildElms
                    ? staticParams.moreChildElms.call(this, data)
                    : null

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
        'Disjunction': createBoxedClass({
            childProps: ['ui.fillers', 'alternatives']
        }),
        'Alternative': createBoxedClass({
            childProps: ['ui.fillers', 'terms']
        }),
        'Quantified': createBoxedClass({
            stroke: 'red',
            strokeW: 3,
            childProps: ['ui.arrows', 'target']
        }),
        'Group': createBoxedClass({
            stroke: 'blue',
            strokeW: 3,
            childProps: ['grouped']
        }),
        'Set of Chars': createBoxedClass({
            stroke: 'purple',
            strokeW: 3,
            childProps: ['ui.arrows', 'possibilities']
        }),
        'Range of Chars': createBoxedClass({
            stroke: '#882',
            strokeW: 2,
            childProps: ['ui.fillers', 'range']
        }),
        'TextsOnly': createBoxedClass({
            stroke: '#bbb',
            strokeW: 2,
            moreChildElms: function(data) {
                var self = this
                return data.ui.rows.map(function(row, i) {
                    return (
                        <text x={row.pos[0]} y={row.pos[1]} textAnchor={row.anchor}
                            fontFamily="monospace" key={i} onClick={self.handleEvents}>
                            {row.text}
                        </text>
                    )
                })
            }
        }),

        'hr': React.createClass(extend({
            render: function() {
                var hr = this.props.data
                var y = hr.pos[1] + hr.dim[1] / 2
                return (
                    <line x1={hr.pos[0]} y1={y}
                        x2={hr.pos[0] + hr.dim[0]} y2={y}
                        stroke="#ddd" strokeWidth="1" />
                )
            }
        })),
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
                    }
                */
                var data = this.props.data
                var segms = data.d

                var txform = ['translate(', (data.pos || [0,0]), ')'].join('')

                if (data.usesMarker !== false) {
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

                return (
                    <g transform={txform}>
                        <path d={pathStr} markerEnd="url(#marker-tri)" stroke="orange" fill="none" />
                    </g>
                )
            }
        }))
    }
    function createInstance(handleEvents, data, key) {
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
            key: key
        })
        return instance
    }

    reactClasses.Surface = Surface
})(window.reactClasses = window.reactClasses || {})
