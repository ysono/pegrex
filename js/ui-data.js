;(function(surfaceData) {
    'use strict'

    surfaceData.markerLen = 7
    surfaceData.neighborArrowColor = '#8a8a8a'
    var fillForNegative = '#ccc'

    var typeToChildProp = {
        'Pattern': 'roots',
        'Disjunction': 'alternatives',
        'Alternative': 'terms',
        'Quantified': 'target',
        'Grouped Assertion': 'grouped',
        'Group': 'grouped',
        'Set of Chars': 'possibilities',
        'Range of Chars': 'range'
    }
    surfaceData.getChildVal = function(data) {
        var prop = typeToChildProp[data.type]
        return prop && data[prop]
    }

    /*
        Use when there are 0..* children. If only 1..1, use setUiByType.

        Conceptually,
        1) Call setUiByType on all children -->
            now children each have dim
        2) Gather all dims of children -->
            assign pos on children
            assign pos and dim on parent's fillers
        3) Based on dim/pos of the farthest child -->
            assign dim on parent
            not assigning pos on parent

        Fillers are optional.
        Fillers depend on post-processing to add `type` and other necessary data
    */
    function withChildren(
        parentData,
        pad, /* {x: [n,n], y: [n,n]} -- where [n,n] are start and end paddings in that direction */
        intraMargin, /* spacing between children and fillers */
        dirPara, /* 'x' or 'y'. direction of expansion. */

        fillerDimPara /* optional, needed iff using fillers.
            dimension of filler in the direction of expansion.
            its dimension in the other direction will equal to that of the largest child */
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

        var children = surfaceData.getChildVal(parentData)

        if (! children.length) {
            return parentData.ui = {
                dim: toCoord(
                    pad[dirPara][0] + pad[dirPara][1],
                    pad[dirOrtho][0] + pad[dirOrtho][1]
                ),
                fillers: []
            }
        }

        var parentUi = parentData.ui = {}
        var fillers = parentUi.fillers = []

        // the farthest point in the direction of expansion being occupied by children
        var maxPosPara = pad[dirPara][0] - intraMargin
        var maxChildDimOrtho = 0

        var usesFillers = typeof fillerDimPara === 'number'
        var delayeds = []
        children.forEach(function(child, i) {
            if (usesFillers && i) {
                ;(function() {
                    var fillerPosPara = maxPosPara + intraMargin

                    var filler = {
                        pos: toCoord(fillerPosPara, pad[dirOrtho][0])
                    }
                    fillers.push(filler)
                    delayeds.push(function() {
                        filler.dim = toCoord(fillerDimPara, maxChildDimOrtho)
                    })

                    maxPosPara = fillerPosPara + fillerDimPara
                })()
            }

            var childUi = setUiByType(child)
            var childPosPara = maxPosPara + intraMargin

            delayeds.push(function() {
                var childPosOrtho = pad[dirOrtho][0] +
                    (maxChildDimOrtho - readCoord(childUi.dim, dirOrtho)) / 2
                childUi.pos = toCoord(childPosPara, childPosOrtho)
            })

            maxPosPara = childPosPara + readCoord(childUi.dim, dirPara)
            maxChildDimOrtho = Math.max(maxChildDimOrtho, readCoord(childUi.dim, dirOrtho))
        })
        delayeds.forEach(function(delayed) {
            delayed()
        })

        parentUi.dim = toCoord(
            maxPosPara + pad[dirPara][1],
            pad[dirOrtho][0] + maxChildDimOrtho + pad[dirOrtho][1]
        )
        return parentUi
    }

    function withTextsOnly(textProps, data, proto) {
        return function() {
            var ui = data.ui = proto()

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
            
            ui.dim = [
                pad.h * 2 + myW,
                pad.v * 2 + lnH * texts.length
            ]
            ui.textRows = texts.map(function(text, i) {
                return {
                    text: text,
                    pos: [
                        pad.h + myW / 2,
                        pad.v + lnH * (i + 3/4) // TODO why 3/4?
                    ],
                    anchor: 'middle'
                }
            })
            return ui
        }
    }

    /*
        Add horizontal arrows to and from neighbors
            set 1: from (left edge of parent) to (left edge of each child)
            set 2: from (right edge of each child) to (right edge of parent)
        to parentData.ui.neighborArrows
    */
    function addNeighborArrows(parentData, pad) {
        var children = surfaceData.getChildVal(parentData)
        var parentUi = parentData.ui

        var midY = parentUi.dim[1] / 2
        var leftBegin = [0, midY]
        var rightEnd = [parentUi.dim[0], midY]
        parentUi.neighborArrows = children.length
            ? children.reduce(function(allArrows, child) {
                var childUi = child.ui
                var childMidY = childUi.pos[1] + childUi.dim[1] / 2
                allArrows.push({
                    type: 'path',
                    d: [
                        leftBegin,
                        [childUi.pos[0], childMidY]
                    ],
                    fromLeft: true
                },
                {
                    type: 'path',
                    d: [
                        [childUi.pos[0] + childUi.dim[0], childMidY],
                        rightEnd
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
        Sets data.ui.dim
        Does not set data.ui.pos
        If data contains children, recursively sets their .ui.dim and .ui.pos (using fn `withChildren`)
        Returns data.ui, for convenience -- all parents have to post-process what this fn returns
            to, at minimum, add pos.
    */
    function setUiByType(data) {
        var map = {
            'Pattern': function() {
                var ui = withChildren(
                    data,
                    {x: [0,0], y: [0,0]},
                    0,
                    'x'
                )
                ui.stroke = 'none'
                ui.fill = 'none'

                // make the left terminus have higher z-index than disj
                data.roots.push(data.roots.shift())

                // remove markers from disjunction's neighborArrows funneling into the right terminal
                data.roots[0].ui.neighborArrows.forEach(function(arrow) {
                    if (arrow.toRight) {
                        arrow.usesMarker = false
                    }
                })

                return ui
            },
            'Terminus': function() {
                return data.ui = {
                    dim: [0,0],
                    cx: 0,
                    cy: 0,
                    r: 6,
                    fill: '#666'
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
                    pad,
                    5,
                    'y',
                    hrH
                )
                ui.stroke = 'none'
                ui.fill = 'none'

                var hrY = hrH / 2
                ui.fillers.forEach(function(hr) {
                    hr.type = 'path'
                    hr.d = [
                        [0, hrY],
                        [hr.dim[0], hrY]
                    ]
                    hr.usesMarker = false
                    hr.stroke = '#ddd'
                })

                addNeighborArrows(data, pad)

                return ui
            },
            'Alternative': function() {
                var pad = {x: [0,0], y: [0,0]}
                var ui = withChildren(
                    data,
                    pad,
                    2,
                    'x',
                    25
                )
                ui.stroke = 'none'
                ui.fill = 'none'

                var midY = ui.dim[1] / 2 - pad.y[0]
                ui.fillers.forEach(function(arrow) {
                    arrow.type = 'path'
                    arrow.d = [
                        [0, midY],
                        [arrow.dim[0], midY]
                    ]
                })
                return ui
            },
            'Quantified': function() {
                var tUi = setUiByType(data.target)
                var myUi = data.ui = {
                    stroke: '#7a0'
                }

                var pad = {h: 40, v: 10}
                var intraMargin = pad.v // between top/btm edge of target and the arrow that doesn't go thru it

                var arrowMidTopY, /* y where top arrow runs in the middle */
                    arrowMidBtmY, /* ditto bottom */
                    targetY,
                    myH
                var btmArrowStyle = undefined
                if (data.quantifier.min) {
                    // term is at the top
                    targetY = pad.v
                    arrowMidTopY = targetY + tUi.dim[1] / 2
                    arrowMidBtmY = targetY + tUi.dim[1] + intraMargin

                    if (data.quantifier.min === 1 && data.quantifier.max === 1) {
                        myH = targetY + tUi.dim[1] + intraMargin
                    } else {
                        myH = arrowMidBtmY + pad.v
                        btmArrowStyle = 'loop'
                    }
                } else {
                    // term is at the bottom
                    arrowMidTopY = pad.v
                    targetY = arrowMidTopY + intraMargin
                    arrowMidBtmY = targetY + tUi.dim[1] / 2
                    myH = targetY + tUi.dim[1] + pad.v

                    if (data.quantifier.max === 1) {
                        btmArrowStyle = 'thru'
                    } else if (data.quantifier.max) {
                        btmArrowStyle = 'loop'
                    }
                }

                tUi.pos = [pad.h, targetY]
                myUi.dim = [pad.h * 2 + tUi.dim[0], myH]

                // TODO need to show min,max, greedy
                
                var jointXPad = btmArrowStyle === 'thru' // horizontal distance between Quantified's edge and joint point
                    ? 0 : pad.h / 6 * 5
                var jointY = btmArrowStyle === 'thru'
                    ? myH / 2 : arrowMidTopY
                var jointLeft = [jointXPad, jointY]
                var jointRight = [myUi.dim[0] - jointXPad, jointY]

                myUi.neighborArrows = [{
                    // the thru arrow at the top
                    type: 'path',
                    d: [
                        [0, myH / 2],
                        jointLeft,
                        [tUi.pos[0], arrowMidTopY],
                        [tUi.pos[0] + tUi.dim[0], arrowMidTopY],
                        jointRight,
                        [myUi.dim[0], myH / 2]
                    ]
                }]

                if (btmArrowStyle === 'thru') {
                    myUi.neighborArrows.push({
                        type: 'path',
                        d: [
                            jointLeft,
                            [tUi.pos[0], arrowMidBtmY],
                            [tUi.pos[0] + tUi.dim[0], arrowMidBtmY],
                            jointRight
                        ],
                        usesMarker: false
                    })
                } else if (btmArrowStyle === 'loop') {
                    myUi.neighborArrows.push({
                        type: 'path',
                        d: [
                            (function() {
                                var r = 8
                                function arc(clockwise, dx,dy) {
                                    return ['a',r,r,0,0,clockwise,dx,dy].join(' ')
                                }
                                // right of target -> down -> left -> up -> left of target
                                return [
                                    'M', jointRight,
                                    arc(1, r, r),
                                    'L', jointRight[0] + r, arrowMidBtmY - r,
                                    arc(1, -r, r),
                                    'L', jointLeft[0], arrowMidBtmY,
                                    arc(1, -r, -r),
                                    'L', jointLeft[0] - r, jointLeft[1] + r,
                                    arc(1, r, -r)
                                ].join(' ')
                            })()
                        ],
                        usesMarker: false
                    })
                }

                return myUi
            },

            'Grouped Assertion': function() {
                var pad = {x: [10,10], y: [30,10]}
                var cUi = setUiByType(data.grouped)
                cUi.pos = [pad.x[0], pad.y[0]]
                cUi.stroke = '#888'
                return data.ui = {
                    dim: [
                        pad.x[0] + cUi.dim[0] + pad.x[1],
                        pad.y[0] + cUi.dim[1] + pad.y[1]
                    ],
                    stroke: '#09d',
                    fill: /^Pos/.test(data.assertion) ? null : fillForNegative,
                    textRows: [
                    ]
                }
            },
            'Assertion': withTextsOnly(['assertion'], data, function() {
                return {
                    stroke: '#09d',
                    fill: 'Non-Word Boundary' === data.assertion ? fillForNegative : null
                }
            }),

            'Group': function() {
                // TODO show/link number
                var pad = {h: 0, v: 0}
                var cUi = setUiByType(data.grouped)
                cUi.pos = [pad.h, pad.v]
                return data.ui = {
                    dim: [
                        pad.h * 2 + cUi.dim[0],
                        pad.v * 2 + cUi.dim[1]
                    ],
                    stroke: '#fb5'
                }
            },
            'Set of Chars': function() {
                var pad = {x: [30,30], y: [10,10]}
                var ui = withChildren(
                    data,
                    pad,
                    10,
                    'y'
                )
                ui.stroke = '#b7a'
                ui.fill = data.inclusive ? null : fillForNegative

                addNeighborArrows(data, pad)
                
                return ui
            },
            'Range of Chars': function() {
                var ui = withChildren(
                    data,
                    {x: [10,10], y: [10,10]},
                    0,
                    'y',
                    15
                )
                ui.stroke = '#f77'
                ui.fill = data.inclusive ? null : fillForNegative

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

                return ui
            },
            'Any Char': withTextsOnly(['type'],data, function() {
                return {
                    stroke: '#09d',
                    fill: data.inclusive === false ? fillForNegative : null
                }
            }),
            'Specific Char': withTextsOnly(['display'], data, function() {
                return {
                    stroke: '#09d',
                    fill: data.inclusive === false ? fillForNegative : null
                }
            }),
            'Reference': withTextsOnly(['type', 'number'], data, function() {
                return {
                    stroke: '#09d',
                    fill: data.isBack ? null : fillForNegative
                }
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
        `ui` will contain minimum `pos` and `dim` props
            as well as other info compatible with the corresonding react class
            e.g. see fn `createBoxedClass`, a proxy to React.createClass
    */
    surfaceData.addUiData = function(data) {
        var pad = {t:10,r:10,b:10,l:10}

        var dUi = setUiByType(data)
        dUi.pos = [pad.l,pad.t]
        dUi.svgDim = [
            pad.t + dUi.pos[0] + dUi.dim[0] + pad.b,
            pad.l + dUi.pos[1] + dUi.dim[1] + pad.r
        ]
    }

})(window.surfaceData = window.surfaceData || {})
