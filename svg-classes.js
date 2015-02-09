;(function(reactClasses) {
    var Surface = React.createClass({
        render: function() {
            var disj = this.props.tree

            var svgDim = [0,0]
            var childNode
            if (disj) {
                reactClasses.addDimPos(disj)
                svgDim = disj.ui.svgDim
                childNode = <Disjunction disj={disj} />
            }

            var markerStr = '\
                <marker id="marker-tri" \
                    viewBox="0 0 10 10" refX="0" refY="5" markerWidth="12" markerHeight="12" orient="auto" fill="orange"> \
                    <path d="M 0 0 L 10 5 L 0 10 z" /> \
                </marker>'
            return (
                <div className="surface-parent">
                    <svg className="surface"
                            width={svgDim[0]} height={svgDim[1]}>
                        <defs dangerouslySetInnerHTML={{__html: markerStr}}></defs>
                        {childNode}
                    </svg>
                </div>
            )
        }
    })
    var Disjunction = React.createClass({
        render: function() {
            var disj = this.props.disj

            var pos = disj.ui.pos
            var txform = ['translate(', pos, ')'].join('')

            var altNodes = disj.alternatives.map(function(alt, i) {
                return <Alternative key={i} alt={alt} />
            })
            var hrNodes = disj.ui.fillers.map(function(hr, i) {
                return <Hr key={i} hr={hr} />
            })

            return (
                <g transform={txform}>
                    <rect width={disj.ui.dim[0]} height={disj.ui.dim[1]}
                        stroke="red" strokeWidth="6" fill="white" />
                    {altNodes}
                    {hrNodes}
                </g>
            )
        }
    })
    var Hr = React.createClass({
        render: function() {
            var hr = this.props.hr
            var y = hr.pos[1] + hr.dim[1] / 2
            return (
                <line x1={hr.pos[0]} y1={y}
                    x2={hr.pos[0] + hr.dim[0]} y2={y}
                    stroke="#ddd" strokeWidth="1" />
            )
        }
    })
    var Alternative = React.createClass({
        render: function() {
            var alt = this.props.alt

            var txform = ['translate(', alt.ui.pos, ')'].join('')

            var termNodes = alt.terms.map(function(term, i) {
                return <Unit key={i} term={term} />
            })
            var arrowNodes = alt.ui.fillers.map(function(arrow, i) {
                return <ArrowFlat key={i} arrow={arrow} />
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
                        stroke="#bbb" strokeWidth="2" fill="white" />
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

            var markerW = 12 // from defs>marker[markerWidth]
            var start = [0, arrow.dim[1] / 2]
            var end = [arrow.dim[0] - markerW, start[1]]
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
