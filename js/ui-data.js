;(function(reactClasses) {
    'use strict'

    /*
        Standardize the y of arrows between terms.
        A withTextsOnly item with one line of text is the smallest in height as well as likely most frequently seen.
        Its height is 16; div this in half.
    */
    var interTermArrowY = 8

    /*
        Conceptually,
        1) Call setUiByType on all children -->
            now children each have dim
        2) Gather all dims of children -->
            children each have pos
            parent's fillers have pos and dim
        3) Based on dim/pos of the farthest child --> set parent's dim. parent's pos is not set.

        Fillers are optional.
        Fillers depend on post-processing to add `type` and other necessary data
    */
    function withChildren(
        parentData,
        children,
        pad, /* {x: [n,n], y: [n,n]} -- where [n,n] are start and end paddings in that direction */
        intraMargin, /* spacing between children and filters */
        dirPara, /* 'x' or 'y'. direction of expansion. */

        fillerDim /* {x: n, y: n} -- optional, needed iff using fillers. width and height of filler.
            fillerDim[dirPara] is required, but the orthogonal dim can be 0. */
        ) {

        var dirOrtho = dirPara === 'x' ? 'y' : 'x'

        function readCoord(coord, dir) {
            var i = dir === 'x' ? 0 : 1
            return coord[i]
        }
        function toCoord(valPara, valOrtho) {
            if (dirPara === 'x') {
                return [valPara, valOrtho]
            } else {
                return [valOrtho, valPara]
            }
        }

        // this pair of vars indicate the farthest point being occupied by the last children
        var maxPara = pad[dirPara][0] - intraMargin
        var maxOrtho = 0

        var parentUi = parentData.ui = {}
        var fillers = parentUi.fillers = []

        children.forEach(function(child, i) {
            if (fillerDim && i) {
                ;(function() {
                    var fillerPosPara = maxPara + intraMargin
                    var fillerPosOrtho = pad[dirOrtho][0]

                    var filler = {
                        pos: toCoord(fillerPosPara, fillerPosOrtho),
                        dim: toCoord(fillerDim[dirPara], fillerDim[dirOrtho])
                    }
                    fillers.push(filler)

                    maxPara = fillerPosPara + fillerDim[dirPara]
                    // not updating maxOrtho b/c filler is assumed to be smaller than any children in the ortho dir.
                })()
            }

            var childUi = setUiByType(child)
            var childPosPara = maxPara + intraMargin
            var childPosOrtho = pad[dirOrtho][0]

            childUi.pos = toCoord(childPosPara, childPosOrtho)

            maxPara = childPosPara + readCoord(childUi.dim, dirPara)
            maxOrtho = Math.max(maxOrtho, childPosOrtho + readCoord(childUi.dim, dirOrtho))
        })

        parentUi.dim = children.length
            ? toCoord(
                maxPara + pad[dirPara][1],
                maxOrtho + pad[dirOrtho][1]
            )
            : toCoord(
                pad[dirPara][0] + pad[dirPara][1],
                pad[dirOrtho][0] + pad[dirOrtho][1]
            )

        return parentUi
    }

    function withTextsOnly(data, textProps, isNegative) {
        return function() {
            var pad = {h: 3, v: 1}
            var lnH = 16 // 1em
            var charW = lnH / 2
            var texts = textProps.map(function(prop) {
                return String(data[prop])
            })
            var textLens = texts.map(function(t) {
                return t.length
            })
            var myW = charW * Math.max.apply(Math, textLens)
            return data.ui = {
                dim: [
                    pad.h * 2 + myW,
                    pad.v * 2 + lnH * texts.length
                ],
                rows: texts.map(function(text, i) {
                    return {
                        text: text,
                        pos: [
                            pad.h + myW / 2,
                            pad.v + lnH * (i + 3/4) // TODO why 3/4?
                        ],
                        anchor: 'middle'
                    }
                }),
                isNegative: isNegative ? isNegative() : false
            }
        }
    }

    function addArrowsBetweenNeighbors(parentData, children, pad) {
        var parentUi = parentData.ui
        // arrows between neighbors are always in the horizontal direction.
        var leftBegin = [0, interTermArrowY]
        var rightEnd = [parentUi.dim[0], interTermArrowY]
        parentUi.arrows = children.length
            ? children.reduce(function(allArrows, child) {
                var childUi = child.ui
                var childEdgeContactY = childUi.pos[1] + interTermArrowY
                allArrows.push({
                    type: 'path',
                    d: [
                        leftBegin.slice(),
                        [childUi.pos[0], childEdgeContactY]
                    ],
                    fromLeft: true
                },
                {
                    type: 'path',
                    d: [
                        [childUi.pos[0] + childUi.dim[0], childEdgeContactY],
                        [parentUi.dim[0] - pad.x[1], childEdgeContactY], // drag out horizontally to the right
                        rightEnd.slice()
                    ],
                    toRight: true
                })
                return allArrows
            }, [])
            : [{
                type: 'path',
                d: [
                    leftBegin,
                    rightEnd
                ],
                fromLeft: true,
                toRight: true
            }]
    }

    /*
        Sets and returns data.ui.dim
        Does not set data.ui.pos
        If data contains children, recursively sets their .ui.dim and .ui.pos (see `withChildren`)
    */
    function setUiByType(data) {
        var map = {
            'Pattern': function() {
                var pad = {x: [0,0], y: [0,0]}
                var ui = withChildren(
                    data,
                    data.roots,
                    pad,
                    0,
                    'x'
                )
                // make the left terminus have higher z-index than disj
                data.roots.push(data.roots.shift())

                // flatten arrows between root disj and its neighbors which are termini.
                // adjustment is (top pad of disj) + (top pad of alt)
                var adjustment = 10
                data.roots.forEach(function(root) {
                    if (root.type === 'Terminus') {
                        root.ui.pos[1] += adjustment
                    } else {
                        // disj
                        root.ui.arrows.forEach(function(arrow) {
                            if (arrow.fromLeft) {
                                arrow.d[0][1] += adjustment
                            }
                            if (arrow.toRight) {
                                arrow.d.slice(-1)[0][1] += adjustment
                                // remove markers from arrows that funnel into the right-hand side terminus
                                arrow.usesMarker = false
                            }
                        })
                    }
                })

                return ui
            },
            'Terminus': function() {
                var r = 6
                return data.ui = {
                    dim: [0,0],
                    cx: 0,
                    cy: interTermArrowY,
                    r: r
                }
            },
            'Disjunction': function() {
                var pad = {x: [30,30], y: [10,10]}
                var hrH = 30

                // deleting some of parser output here!!
                data.alternatives = data.alternatives.filter(function(alt) {
                    return alt.terms.length
                })
                var ui = withChildren(
                    data,
                    data.alternatives,
                    pad,
                    5,
                    'y',
                    {x: 0, y: hrH}
                )

                // set hr width as maximal width of alternatives
                var hrW = ui.dim[0] - pad.x[0] - pad.x[1]
                ui.fillers.forEach(function(hr) {
                    hr.type = 'path'
                    hr.d = [
                        [0, hrH / 2],
                        [hrW, hrH / 2]
                    ]
                    hr.usesMarker = false
                    hr.markerColor = '#ddd'
                })

                addArrowsBetweenNeighbors(data, data.alternatives, pad)

                return ui
            },
            'Alternative': function() {
                var ui = withChildren(
                    data,
                    data.terms,
                    {x: [0,0], y: [0,0]},
                    2,
                    'x',
                    {x: 25, y: 0}
                )
                ui.fillers.forEach(function(arrow) {
                    arrow.type = 'path'
                    arrow.d = [
                        [0, interTermArrowY],
                        [arrow.dim[0], interTermArrowY]
                    ]
                })
                return ui
            },
            'Quantified': function() {
                var tUi = setUiByType(data.target)
                var myUi = data.ui = {}

                var pad = {h: 30, v: interTermArrowY}
                var intraMargin = pad.v // between top/btm edge of target and the arrow that doesn't go thru it

                var arrowMidTopY, /* y where top arrow runs in the middle */
                    arrowMidBtmY, /* ditto bottom */
                    targetY,
                    myH
                var needArrowBtm = true
                if (data.quantifier.min) {
                    // term is at the top
                    targetY = pad.v
                    arrowMidTopY = targetY + interTermArrowY
                    arrowMidBtmY = targetY + tUi.dim[1] + intraMargin

                    if (data.quantifier.min === 1 && data.quantifier.max === 1) {
                        needArrowBtm = false
                        myH = targetY + tUi.dim[1] + intraMargin
                    } else {
                        myH = arrowMidBtmY + pad.v
                    }
                } else {
                    // term is at the bottom
                    arrowMidTopY = interTermArrowY
                    targetY = arrowMidTopY + intraMargin
                    arrowMidBtmY = targetY + interTermArrowY
                    myH = targetY + tUi.dim[1] + pad.v

                    if (! data.quantifier.max) {
                        // min and max are 0
                        needArrowBtm = false
                    }
                }

                tUi.pos = [
                    pad.h,
                    targetY
                ]
                myUi.dim = [
                    pad.h * 2 + tUi.dim[0],
                    myH
                ]

                // TODO need to show min,max, greedy
                
                // thru arrow at the top
                myUi.arrows = [{
                    d: [
                        [0, interTermArrowY],
                        [tUi.pos[0], arrowMidTopY],
                        [tUi.pos[0] + tUi.dim[0], arrowMidTopY],
                        [myUi.dim[0], interTermArrowY]
                    ]
                }]
                // detour arrow at the bottom
                if (needArrowBtm) {
                    ;(function() {
                        var r = 8
                        function arc(clockwise, dx,dy) {
                            return ['a',r,r,0,0,clockwise,dx,dy].join(' ')
                        }
                        var jointLeftX
                        var jointRightX

                        var arrowBtm
                        if (data.quantifier.min === 0 && data.quantifier.max === 1) {
                            // left edge -> down -> right -> up -> right edge
                            jointLeftX = pad.h / 3 * 2
                            jointRightX = myUi.dim[0] - jointLeftX
                            arrowBtm = (function() {
                                var startOfPath = [jointLeftX - r, arrowMidTopY]
                                var path = [
                                    'L', startOfPath,
                                    arc(1, r, r),
                                    'L', jointLeftX, arrowMidBtmY - r,
                                    arc(0, r, r),
                                    'L', jointRightX - r, arrowMidBtmY,
                                    arc(0, r, -r),
                                    'L', jointRightX, arrowMidTopY + r,
                                    arc(1, r, -r)
                                ].join(' ')
                                return {
                                    d: [
                                        [0, interTermArrowY],
                                        startOfPath,
                                        path,
                                        [myUi.dim[0], interTermArrowY]
                                    ]
                                }
                            })()
                        } else {
                            // right of target -> down -> left -> up -> left of target
                            jointLeftX = pad.h / 3
                            jointRightX = myUi.dim[0] - jointLeftX
                            arrowBtm = (function() {
                                var path = [
                                    'M', tUi.pos[0] + tUi.dim[0], arrowMidTopY,
                                    'L', jointRightX - r, arrowMidTopY,
                                    arc(1, r, r),
                                    'L', jointRightX, arrowMidBtmY - r,
                                    arc(1, -r, r),
                                    'L', jointLeftX + r, arrowMidBtmY,
                                    arc(1, -r, -r),
                                    'L', jointLeftX, arrowMidTopY + r,
                                    arc(1, r, -r)
                                ].join(' ')
                                return {
                                    d: [
                                        path,
                                        [tUi.pos[0], arrowMidTopY]
                                    ]
                                }
                            })()
                        }
                        arrowBtm.usesMarker = false
                        myUi.arrows.push(arrowBtm)
                    })()
                }
                myUi.arrows.forEach(function(arrow) {
                    arrow.type = 'path'
                })

                return myUi
            },
            'Group': function() {
                // TODO show/link number
                var pad = {h: 0, v: 0} // even with 0 gaps can exist from disj and alt.
                var cUi = setUiByType(data.grouped)
                cUi.pos = [pad.h, pad.v]
                return data.ui = {
                    dim: [
                        pad.h * 2 + cUi.dim[0],
                        pad.v * 2 + cUi.dim[1]
                    ]
                }
            },
            'Set of Chars': function() {
                var pad = {x: [30,30], y: [10,10]}
                var ui = withChildren(
                    data,
                    data.possibilities,
                    pad,
                    10,
                    'y'
                )
                addArrowsBetweenNeighbors(data, data.possibilities, pad)

                ui.isNegative = ! data.inclusive
                
                return ui
            },
            'Range of Chars': function() {
                var ui = withChildren(
                    data,
                    data.range,
                    {x: [10,10], y: [10,10]},
                    0,
                    'y',
                    {x: 0, y: 15}
                )

                var rangeWs = data.range.map(function(sub) {
                    return sub.ui.dim[0]
                })
                var linkW = Math.max.apply(Math, rangeWs)
                // TODO do i need to set link.dim[0]?
                var link = ui.fillers[0]
                link.type = 'path'
                link.d = [
                    [linkW / 2, 0],
                    [linkW / 2, link.dim[1]]
                ]
                link.isVertical = true
                link.usesMarker = false

                ui.isNegative = ! data.inclusive

                return ui
            },
            'Any Char': withTextsOnly(data, ['type']),
            'Specific Char': withTextsOnly(data, ['display'], function() {
                return data.inclusive === false
            }),
            'Reference': withTextsOnly(data, ['type', 'number'], function() {
                return ! data.isBack
            }),
            'Assertion': withTextsOnly(data, ['type', 'assertion'], function() {
                return ['Non-Word Boundary', 'Negative Look-Forward'].indexOf(data.assertion) >= 0
            })
        } // end of var map

        var fn = map[data.type]
        if (fn) {
            return fn()
        } else {
            console.error('could not determine how to set ui data', data)
        }
    } // end of fn setUiByType

    /*
        Recursively sets `ui` prop to the data obj and its children.
        Does not modify any other prop.
        `ui` will contain at minimum `pos` and `dim` props,
            and it can contain other info for drawing other things inside the compo.
    */
    reactClasses.addUiData = function(data) {
        var pad = {t:10,r:10,b:10,l:10}

        var dUi = setUiByType(data)
        dUi.pos = [pad.l,pad.t]
        dUi.svgDim = [
            pad.t + dUi.pos[0] + dUi.dim[0] + pad.b,
            pad.l + dUi.pos[1] + dUi.dim[1] + pad.r
        ]
    }

    /* now some static data */
    reactClasses.markerLen = 7
    reactClasses.markerColor = '#8a8a8a'

})(window.reactClasses = window.reactClasses || {})
