(function(reactClasses) {
    function setUi(data) {
        function oneChar() {
            return data.ui = {
                dim: (function() {
                    var lnH = 16 // 1em
                    var charW = 12 // arbitrary
                    return [
                        charW * Math.max(data.type.length, data.display.length),
                        lnH * 2
                    ]
                })()
            }
        }
        var map = {
            'Specific Char': oneChar,
            'Any Char': oneChar,
            'Alternative': function() {
                var leftRightPadding = 10
                var topBottomPadding = 10
                var leftRightMarginBetweenChildren = 20
                
                var arrowW = 50
                var arrowH = 32 // min h of terms
                var arrowMarkerW = 12

                var maxChildXW = leftRightPadding - leftRightMarginBetweenChildren
                var maxChildH = 0

                data.arrows = []

                data.terms.forEach(function(t, i) {
                    var arrow
                    if (i) {
                        arrow = {
                            dim: [
                                arrowW, arrowH
                            ],
                            pos: [
                                maxChildXW + leftRightMarginBetweenChildren,
                                topBottomPadding
                            ],
                            markerW: arrowMarkerW
                        }
                        data.arrows.push(arrow)
                        maxChildXW = arrow.pos[0] + arrow.dim[0]
                        maxChildH = Math.max(maxChildH, arrow.pos[1] + arrow.dim[1])
                    }

                    var tUi = setUi(t)
                    tUi.pos = [
                        maxChildXW + leftRightMarginBetweenChildren,
                        topBottomPadding
                    ]
                    maxChildXW = tUi.pos[0] + tUi.dim[0]
                    maxChildH = Math.max(maxChildH, tUi.pos[1] + tUi.dim[1])
                })

                return data.ui = {
                    dim: [
                        maxChildXW + leftRightPadding,
                        maxChildH + topBottomPadding
                    ]
                }
            },
            'Disjunction': function() {
                var leftRightPadding = 10
                var topBottomPadding = 10
                var topBottomMarginBetweenChildren = 20

                var hrH = 30

                var maxChildW = 0
                var maxChildYH = topBottomPadding - topBottomMarginBetweenChildren

                data.hrs = []

                data.alternatives.forEach(function(alt ,i) {
                    var hr
                    if (i) {
                        hr = {
                            pos: [
                                leftRightPadding,
                                maxChildYH + topBottomMarginBetweenChildren
                            ]
                        }
                        data.hrs.push(hr)
                        maxChildYH = hr.pos[0] + hrH
                    }

                    var aUi = setUi(alt)
                    aUi.pos = [
                        leftRightPadding,
                        maxChildYH + topBottomMarginBetweenChildren
                    ]
                    maxChildYH = aUi.pos[1] + aUi.dim[1]
                    maxChildW = Math.max(maxChildW, aUi.pos[0] + aUi.dim[0])
                })
                data.hrs.forEach(function(hr) {
                    hr.dim = [
                        maxChildW,
                        hrH
                    ]
                })

                return data.ui = {
                    dim: [
                        maxChildW + leftRightPadding,
                        maxChildYH + topBottomPadding
                    ]
                }
            }
        }// end of var map
        return map[data.type]()
    }

    var Surface = React.createClass({
        render: function() {
            // var tree = {
            //     type: 'Disjunction',
            //     alternatives: [{
            //         type: 'Alternative',
            //         terms: [{
            //             'type': 'Any Char',
            //             'display': '.'
            //         }, {
            //             type: 'Specific Char',
            //             display: 'p'
            //         }]
            //     }]
            // }
            var tree = this.props.tree
            if (tree) {setUi(tree)}
            var childNode = tree
                ? ( <Disjunction disj={tree} /> )
                : null

            var markerStr = '\
                <marker id="marker-tri" \
                    viewBox="0 0 10 10" refX="0" refY="5" markerWidth="12" markerHeight="12" orient="auto" fill="orange"> \
                    <path d="M 0 0 L 10 5 L 0 10 z" /> \
                </marker>'
            return (
                <svg>
                    <defs dangerouslySetInnerHTML={{__html: markerStr}}></defs>
                    {childNode}
                </svg>
            )
        }
    })
    var Disjunction = React.createClass({
        render: function() {
            var disj = this.props.disj

            var pos = disj.ui.pos || [48,32] // if undefined, this is the root disj.
            var txform = ['translate(', pos, ')'].join('')

            var childNodes = disj.alternatives.map(function(alt, i) {
                return (
                    <Alternative alt={alt} />
                )
            })

            return (
                <g transform={txform}>
                    <rect width={disj.ui.dim[0]} height={disj.ui.dim[1]}
                        stroke="red" strokeWidth="6" fill="white" />
                    {childNodes}
                </g>
            )
        }
    })
    var Alternative = React.createClass({
        render: function() {
            var alt = this.props.alt

            var txform = ['translate(', alt.ui.pos, ')'].join('')

            var termNodes = alt.terms.map(function(term, i) {
                return (
                    <Unit key={i} term={term} />
                )
            })
            var arrowNodes = alt.arrows.map(function(arrow, i) {
                return (
                    <ArrowFlat key={i} arrow={arrow} />
                )
            })

            return (
                <g transform={txform}>
                    <rect width={alt.ui.dim[0]} height={alt.ui.dim[1]}
                        stroke="green" strokeWidth="4" fill="white" />
                    {termNodes}
                    {arrowNodes}
                </g>
            )
        }
    })
    var Unit = React.createClass({
        render: function() {
            var term = this.props.term

            var txform = ['translate(', term.ui.pos, ')'].join('')

            var dim = term.ui.dim
            
            return (
                <g transform={txform}>
                    <rect width={dim[0]} height={dim[1]}
                        stroke="#ccc" strokeWidth="2" fill="white" />
                    <text x={dim[0]/2} y="12" textAnchor="middle"
                        fontFamily="monospace">{term.type}</text>
                    <text x={dim[0]/2} y="28" textAnchor="middle"
                        fontFamily="monospace">{term.display}</text>
                </g>
            )
        }
    })
    var ArrowFlat = React.createClass({
        render: function() {
            var arrow = this.props.arrow

            var txform = ['translate(', arrow.pos, ')'].join('')

            var start = [0, arrow.dim[1] / 2]
            var end = [arrow.dim[0] - arrow.markerW, start[1]]
            var d = ['M', start, 'L', end].join(' ')

            return (
                <g transform={txform}>
                    <path d={d} markerEnd="url(#marker-tri)" stroke="orange" />
                </g>
            )
        }
    })

    reactClasses.Surface = Surface
})(window.reactClasses = window.reactClasses || {})
