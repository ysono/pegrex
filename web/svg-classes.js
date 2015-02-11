;(function(reactClasses) {
    'use strict'

    var Surface = React.createClass({
        render: function() {
            var tree = this.props.tree

            var svgDim = [0,0]
            var childNode
            if (tree) {
                reactClasses.addDimPos(tree)
                svgDim = tree.ui.svgDim
                childNode = createInstance(tree)
            }

            var markerStr = '\
                <marker id="marker-tri" \
                    viewBox="0 0 10 10" refX="0" refY="5" markerWidth="12" markerHeight="12" orient="auto" fill="orange"> \
                    <path d="M 0 0 L 10 5 L 0 10 z" /> \
                </marker>'
            return (
                <div className="surface-parent">
                    <svg width={svgDim[0]} height={svgDim[1]}>
                        <defs dangerouslySetInnerHTML={{__html: markerStr}}></defs>
                        {childNode}
                    </svg>
                </div>
            )
        }
    })

    function createBoxedClass(staticParams) {
        return React.createClass({
            render: function() {
                var data = this.props.data

                var txform = ['translate(', data.ui.pos, ')'].join('')

                var boxElm = (
                    <rect width={data.ui.dim[0]} height={data.ui.dim[1]}
                            stroke={staticParams.stroke}
                            strokeWidth={staticParams.strokeW}
                            fill={staticParams.fill || 'white'} />
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
                                return createInstance(childData, i)
                            })
                        return childList
                    })

                // additional nodes will go on top of everything else
                var moreChildElms = staticParams.moreChildElms
                    ? staticParams.moreChildElms(data)
                    : null

                return (
                    <g transform={txform}>
                        {[boxElm].concat(childElms).concat(moreChildElms)}
                    </g>
                )
            }
        })
    }
    var typeToClass = {
        'Disjunction': createBoxedClass({
            stroke: 'red',
            strokeW: 6,
            childProps: ['ui.fillers', 'alternatives']
        }),
        'Alternative': createBoxedClass({
            stroke: 'green',
            strokeW: 4,
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
        'Char': createBoxedClass({
            stroke: '#bbb',
            strokeW: 2,
            moreChildElms: function(data) {
                // TODO 12 and 28
                return (<g>
                    <text x={data.ui.dim[0]/2} y="12" textAnchor="middle"
                        fontFamily="monospace">{data.type}</text> 
                    <text x={data.ui.dim[0]/2} y="28" textAnchor="middle"
                        fontFamily="monospace">{data.display}</text>
                </g>)
            }
        }),

        'hr': React.createClass({
            render: function() {
                var hr = this.props.data
                var y = hr.pos[1] + hr.dim[1] / 2
                return (
                    <line x1={hr.pos[0]} y1={y}
                        x2={hr.pos[0] + hr.dim[0]} y2={y}
                        stroke="#ddd" strokeWidth="1" />
                )
            }
        }),
        'arrow': React.createClass({
            render: function() {
                // TODO test
                /* in this.props.arrow: {
                        pos: optional -- [n,n]
                        d: required -- array of (strings or [n,n]), but last element must be [n,n]
                    }
                    Segments in d are connected by...
                        * -> (nothing) -> string
                        coord -> quadratic bezier -> coord
                        string -> straight line -> coord
                    Last point in d is adjusted for marker
                    All numbers in coords are absolute
                */
                var arrow = this.props.data

                var txform = ['translate(', (arrow.pos || [0,0]), ')'].join('')

                // from defs>marker[markerWidth]
                var markerLen = 12
                var end = arrow.d.slice(-1)[0]
                // always move the end to the left b/c all our arrows point to the right
                end[0] -= markerLen

                var segms = arrow.d.reduce(function(segms, next, i) {
                    var segm = (function() {
                        if (typeof next === 'string') {
                            // (coord or string or beginning of array) followed by string
                            return next
                        }
                        if (arrow.d[i - 1] instanceof Array) {
                            // coord followed by coord
                            return window.utils.reflectedQuadra(arrow.d[i - 1], next)
                        }
                        if (i) {
                            // string followed by coord
                            return ['L', next]
                        }
                        // beginning of array followed by coord
                        return ['M', next]
                    })()
                    return segms.concat(segm)
                }, [])
                var d = segms.join(' ')

                return (
                    <g transform={txform}>
                        <path d={d} markerEnd="url(#marker-tri)" stroke="orange" fill="none" />
                    </g>
                )
            }
        })
    }
    function createInstance(data, key) {
        var aliases = {
            'Any Char': 'Char',
            'Specific Char': 'Char',
            'Reference': 'Char'
        }
        var clazz = typeToClass[data.type]
            || typeToClass[aliases[data.type]]
        if (! clazz) {
            console.error('could not find the react type for data', data)
        }
        var instance = React.createElement(clazz, {
            data: data,
            key: key
        })
        return instance
    }

    reactClasses.Surface = Surface
})(window.reactClasses = window.reactClasses || {})
