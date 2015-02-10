;(function(reactClasses) {
    'use strict'

    // TODO compact this map and all the react classes together
    //     there is a ton of repetition in them
    var typeToCompo = {
        'Disjunction': function(disj, i) {
            return <Disjunction key={i} disj={disj} />
        },

        'Quantified': function(q, i) {
            return <Quantified key={i} q={q} />
        },

        'Group': function(group, i) {
            return <Group key={i} group={group} />
        },
        
        'Set of Chars': function(term, i) {
            return <CharSet key={i} term={term} />
        },
        'Any Char': function(term, i) {
            return <Char key={i} term={term} />
        },
        'Specific Char': function(term, i) {
            return <Char key={i} term={term} />
        },
        'Reference': function(assertion, i) {
            assertion.display = assertion.number // TODO do this in parser if it's permanent
            return <Char key={i} term={assertion} />
        }
    }

    var Surface = React.createClass({
        render: function() {
            var disj = this.props.tree

            var svgDim = [0,0]
            var childNode
            if (disj) {
                reactClasses.addDimPos(disj)
                svgDim = disj.ui.svgDim
                childNode = typeToCompo[disj.type](disj)
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
                    {hrNodes}
                    {altNodes}
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
                return typeToCompo[term.type](term, i)
            })
            var arrowNodes = alt.ui.fillers.map(function(arrow, i) {
                return <Arrow key={i} arrow={arrow} />
            })

            return (
                <g transform={txform}>
                    <rect width={alt.ui.dim[0]} height={alt.ui.dim[1]}
                        stroke="green" strokeWidth="4" fill="white" />
                    {arrowNodes}
                    {termNodes}
                </g>
            )
        }
    })

    var Group = React.createClass({
        render: function() {
            var group = this.props.group

            var txform = ['translate(', group.ui.pos, ')'].join('')

            var grouped = group.grouped
            var groupedNode = typeToCompo[grouped.type](grouped)

            return (
                <g transform={txform}>
                    <rect width={group.ui.dim[0]} height={group.ui.dim[1]}
                        stroke="blue" strokeWidth="3" fill="white" />
                    {groupedNode}
                </g>
            )
        }
    })

    var Quantified = React.createClass({
        render: function() {
            var q = this.props.q

            var txform = ['translate(', q.ui.pos, ')'].join('')

            var termNode = typeToCompo[q.target.type](q.target)
            var arrowNodes = q.ui.arrows.map(function(arrow, i) {
                return <Arrow key={i} arrow={arrow} />
            })

            return (
                <g transform={txform}>
                    <rect width={q.ui.dim[0]} height={q.ui.dim[1]}
                        stroke="red" strokeWidth="3" fill="white" />
                    {arrowNodes}
                    {termNode}
                </g>
            )
        }
    })

    var CharSet = React.createClass({
        render: function() {
            var term = this.props.term

            var txform = ['translate(', term.ui.pos, ')'].join('')

            var charNodes = term.possibilities.map(function(subTerm, i) {
                return typeToCompo[subTerm.type](subTerm, i)
            })
            var arrowNodes = term.ui.arrows.map(function(arrow, i) {
                return <Arrow key={i} arrow={arrow} />
            })

            return (
                <g transform={txform}>
                    <rect width={term.ui.dim[0]} height={term.ui.dim[1]}
                        stroke="purple" strokeWidth="3" fill="white" />
                    {arrowNodes}
                    {charNodes}
                </g>
            )
        }
    })
    var Char = React.createClass({
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
    var Arrow = React.createClass({
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
            var arrow = this.props.arrow

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

    reactClasses.Surface = Surface
})(window.reactClasses = window.reactClasses || {})
