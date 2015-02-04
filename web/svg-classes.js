(function(reactClasses) {
    var Surface = React.createClass({
        render: function() {
            debugger
            var blocks = this.props.tree && this.props.tree.alternatives
                ? this.props.tree.alternatives[0].terms
                : [] // TODO
            blocks = blocks.filter(function(b) {
                return b.type === 'Specific Char' || b.type === 'Any Char'
            }) // TODO
            var arrows = []
            function spaceOutSiblings() {
                var nextXPx = 30 // margin left
                var nextYPx = 30 // margin top
                var spaceXPx = 100
                blocks.forEach(function(block, i) {
                    var wPx = block.type.length * 12
                    block.w = wPx
                    block.x = nextXPx
                    nextXPx += wPx + spaceXPx
                    block.y = nextYPx
                    block.h = 48 // 3em

                    if (i > 0) {
                        arrows.push({
                            start: (function(prevBlock) {
                                return [prevBlock.x + prevBlock.w + 10,
                                    prevBlock.y + prevBlock.h / 2]
                            })(blocks[i-1]),
                            end: [block.x - 10,
                                block.y + block.h / 2]
                        })
                    }
                })
            }
            spaceOutSiblings()
            var blockChildren = blocks.map(function(block, i) {
                debugger
                return block.quantifier ? (
                    <RepeatedBlock key={'block' + i} block={block} />
                ):(
                    <Block key={'block' + i} block={block} />
                )
            })
            var arrowChildren = arrows.map(function(arrow, i) {
                return (
                    <Arrow key={'arrow' + i} arrow={arrow} />
                )
            })

            var markerStr = '\
                <marker id="marker-tri" \
                    viewBox="0 0 10 10" refX="0" refY="5" markerWidth="12" markerHeight="12" orient="auto" fill="orange"> \
                    <path d="M 0 0 L 10 5 L 0 10 z" /> \
                </marker>'
            
            return (
                <svg width="100%" height="100%">
                    <defs dangerouslySetInnerHTML={{__html: markerStr}}></defs>
                    {arrowChildren}
                    {blockChildren}
                </svg>
            )
        }
    })
    var RepeatedBlock = React.createClass({
        render: function() {
            var block = this.props.block
            var d = [
                'M', block.x + block.w + 10, block.y + block.h / 2,
                'l', 40 /* spaceXPx / 2 - arc */ , 0,
                'a 10 10 0 0 1 10 10', // top-left
                'l 0 50',
                'a 10 10 0 0 1 -10 10',
                'l', -(40*2+block.w) /* 40 from above l */ , 0,
                'a 10 10 0 0 1 -10 -10',
                'l 0 -50',
                'a 10 10 0 0 1 10 -10',
                'z'
                ].join(' ')
            if (block.quantifier.min === 0) {
                block.y += 70 /* 50 from d above, plus 2 arcs */
            }
            return (
                <g>
                    <path d={d} stroke="orange" fill="none" />
                    <Block block={block} />
                </g>
            )
        }
    })
    var Block = React.createClass({
        render: function() {
            var block = this.props.block
            var txfrm = ['translate(', block.x, ',', block.y, ')'].join(' ')
            return (
                <g transform={txfrm}>
                    <rect width={block.w} height={block.h} rx=".2em" ry=".2em"
                        stroke="blue" strokeWidth="3px" fill="white" />
                    <text x={block.w / 2} y={block.h / 2} textAnchor="middle" fontFamily="monospace"
                        style={{'alignmentBaseline': 'baseline'}}>
                        {block.type}</text>
                </g>
            )
            // style attr above not needed
        }
    })
    var Arrow = React.createClass({
        render: function() {
            var arrow = this.props.arrow
            var d = ['M', arrow.start, 'L', arrow.end].join(' ')
            return (
                <path d={d} markerEnd="url(#marker-tri)" stroke="orange" />
            )
        }
    })

    reactClasses.Surface = Surface
})(window.reactClasses = window.reactClasses || {})
