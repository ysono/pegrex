;(function(surfaceData) {
    'use strict'

    surfaceData.markerLen = 7
    surfaceData.neighborArrowColor = '#8a8a8a'
    var fillForNegative = '#ccc'

    var typeToChildProp = {
        'Pattern': 'roots',
        'Disjunction': 'alternatives',
        'Alternative': 'terms',
        'Quantified': ['target', 'quantifier'],
        'Grouped Assertion': 'grouped',
        'Group': 'grouped',
        'Set of Chars': 'possibilities',
        'Range of Chars': 'range'
    }
    surfaceData.getChildVal = function(data) {
        var prop = typeToChildProp[data.type]
        if (typeof prop === 'string') {
            return data[prop]
        }
        if (prop instanceof Array) {
            return prop.map(function(prop) {
                return data[prop]
            })
        }
        // else return undefined
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
    function setUiWithChildren(
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

    /*
        Convenience method for creating a text block.
        Returns ui obj that is ready to be used by react classes.
        However, unlike `setUiWith*` methods, this fn does not attach the ui obj to any data.
            Receiver of the ui obj will have to attach it (aside from setting pos as you always have to).
        Optional textLoc makes the rendered textBlock selectable.
    */
    function getTextBlock(contents, textLoc) {
        var lnH = 16 // 1rem
        var charW = lnH / 2

        var textLens = contents.map(function(t) {
            return String(t).length
        })
        var myW = charW * Math.max.apply(Math, textLens)
        var midX = myW / 2

        return {
            type: 'textBlock',
            dim: [myW, lnH * contents.length],
            rows: contents.map(function(content, i) {
                return {
                    text: content,
                    anchorPos: [
                        midX,
                        lnH * (i + 3/4) // why does 3/4 work?
                    ],
                    anchor: 'middle'
                }
            }),
            textLoc: textLoc
        }
    }
    function setUiWithTextsOnly(contents, data) {
        var textBlock = getTextBlock(contents, data.textLoc)

        var pad = {h: 3, v: 1}
        textBlock.pos = [pad.h, pad.v]

        return data.ui = {
            dim: [
                pad.h * 2 + textBlock.dim[0],
                pad.v * 2 + textBlock.dim[1]
            ],
            textBlocks: [textBlock]
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
        If data contains children, recursively sets their .ui.dim and .ui.pos, using `setUiWithChildren`
        Returns data.ui, for convenience -- all parents have to post-process what this fn returns
            to, at minimum, add pos.
    */
    function setUiByType(data) {
        var map = {
            'Pattern': function() {
                var ui = setUiWithChildren(
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
                var ui = setUiWithChildren(
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
                var ui = setUiWithChildren(
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

            'Quantifier': function() {
                var texts = [
                    'min: ' + data.min,
                    'max: ' + (data.max === Infinity ? '\u221e' : data.max),
                ]
                if (data.max > 1) {
                    texts.push(data.greedy ? 'Greedy' : 'Lazy')
                }
                var ui = setUiWithTextsOnly(texts, data)
                ui.fill = '#fff8ea'
                ui.stroke = '#bbb'
                ui.strokeW = 1
                return ui
            },
            'Quantified': function() {
                var tUi = setUiByType(data.target)
                var myUi = data.ui = {
                    stroke: '#7a0'
                }

                var pad = {h: 30, v: 10}
                var intraMargin = pad.v // gap between edges of target and arrows that run parallel to them outside them

                // determine target's and neighborArrows' pos, based on target dim.
                var arrowMidTopY, /* y where top arrow runs in the middle */
                    arrowMidBtmY, /* ditto bottom */
                    targetY,
                    maxChildY
                var btmArrowStyle = undefined
                if (data.quantifier.min) {
                    // term is at the top
                    targetY = pad.v
                    arrowMidTopY = targetY + tUi.dim[1] / 2
                    arrowMidBtmY = targetY + tUi.dim[1] + intraMargin

                    if (data.quantifier.min === 1 && data.quantifier.max === 1) {
                        maxChildY = targetY + tUi.dim[1]
                    } else {
                        maxChildY = arrowMidBtmY
                        btmArrowStyle = 'loop'
                    }
                } else {
                    // term is at the bottom
                    arrowMidTopY = pad.v
                    targetY = arrowMidTopY + intraMargin
                    arrowMidBtmY = targetY + tUi.dim[1] / 2
                    maxChildY = targetY + tUi.dim[1]

                    if (data.quantifier.max === 1) {
                        btmArrowStyle = 'thru'
                    } else if (data.quantifier.max) {
                        btmArrowStyle = 'loop'
                    }
                }

                // add Quantifier ; position target and Quantifier ; set dim of parent (Quantified)
                var myH
                ;(function() {
                    var qUi = setUiByType(data.quantifier)

                    var myW = pad.h * 2 + Math.max(tUi.dim[0], qUi.dim[0])
                    
                    tUi.pos = [
                        (myW - tUi.dim[0]) / 2,
                        targetY
                    ]
                    qUi.pos = [
                        (myW - qUi.dim[0]) / 2,
                        maxChildY + intraMargin
                    ]

                    myH = qUi.pos[1] + qUi.dim[1] + pad.v
                    myUi.dim = [myW, myH]
                })()

                // add neighborArrows
                ;(function() {
                    var atLeftEdge = [0, myH / 2]
                    var atRightEdge = [myUi.dim[0], myH / 2]
                    var atChildLeftEdge = [tUi.pos[0], arrowMidTopY]
                    var atChildRightEdge = [tUi.pos[0] + tUi.dim[0], arrowMidTopY]

                    var jointLeft
                    var jointRight
                    if (btmArrowStyle === 'loop') {
                        jointLeft = [atChildLeftEdge[0] - intraMargin, atChildLeftEdge[1]]
                        jointRight = [atChildRightEdge[0] + intraMargin, atChildRightEdge[1]]
                    } // else if btm arrow is not needed or is 'thru', no need for a joint point.

                    // the thru arrow at the top
                    myUi.neighborArrows = [{
                        type: 'path',
                        d: [
                            atLeftEdge,
                            jointLeft,
                            atChildLeftEdge,
                            atChildRightEdge,
                            jointRight,
                            atRightEdge
                        ].filter(function(coord) {
                            return coord
                        })
                    }]
                    // detour arrow at the bottom
                    if (btmArrowStyle === 'thru') {
                        myUi.neighborArrows.push({
                            type: 'path',
                            d: [
                                atLeftEdge,
                                [tUi.pos[0], arrowMidBtmY],
                                [tUi.pos[0] + tUi.dim[0], arrowMidBtmY],
                                atRightEdge
                            ],
                            usesMarker: false
                        })
                    } else if (btmArrowStyle === 'loop') {
                        myUi.neighborArrows.push({
                            type: 'path',
                            d: [
                                (function() {
                                    var r = intraMargin
                                    function arc(clockwise, dx,dy) {
                                        return ['a',r,r,0,0,clockwise,dx,dy].join(' ')
                                    }
                                    // right of target -> down -> left -> up -> left of target
                                    return [
                                        'M', jointRight[0] - r, jointRight[1],
                                        arc(1, r, r),
                                        'L', jointRight[0], arrowMidBtmY - r,
                                        arc(1, -r, r),
                                        'L', jointLeft[0] + r, arrowMidBtmY,
                                        arc(1, -r, -r),
                                        'L', jointLeft[0], jointLeft[1] + r,
                                        arc(1, r, -r)
                                    ].join(' ')
                                })()
                            ],
                            usesMarker: false
                        })
                    }
                })()

                if (! data.quantifier.min && btmArrowStyle === 'loop') {
                    // if term is at the bottom and bottom arrow is looping,
                    //     b/c arrows in term would be pointing the wrong way,
                    //     and there is no good way to put arrows, remove them
                    ;(function(child) {
                        var disj
                        if (child.type === 'Set of Chars') {
                            tUi.neighborArrows.length = 0
                        } else if (child.type === 'Group') {
                            disj = surfaceData.getChildVal(child)
                            disj.ui.neighborArrows.length = 0
                        }
                    })(surfaceData.getChildVal(data))
                }

                return myUi
            },

            'Grouped Assertion': function() {
                var pad = {x: [10,10], y: [3,10]}
                var intraMargin = 5

                var textBlock = getTextBlock([data.assertion], data.textLoc)
                textBlock.pos = [pad.x[0], pad.y[0]]

                var cUi = setUiByType(data.grouped)
                cUi.pos = [
                    pad.x[0],
                    textBlock.pos[1] + textBlock.dim[1] + intraMargin
                ]
                cUi.stroke = '#888' // otherwise normally disj has stroke 'none'
                cUi.strokeW = 1
                cUi.neighborArrows.length = 0 // disj is not connected with the rest of the flow

                return data.ui = {
                    dim: [
                        pad.x[0] + Math.max(textBlock.dim[0], cUi.dim[0]) + pad.x[1],
                        cUi.pos[1] + cUi.dim[1] + pad.y[1]
                    ],
                    textBlocks: [textBlock],
                    stroke: '#f9f374',
                    fill: /^Pos/.test(data.assertion) ? null : fillForNegative
                }
            },
            'Assertion': function() {
                var ui = setUiWithTextsOnly([data.assertion], data)
                ui.stroke = '#f9f374'
                ui.fill = 'Non-Word Boundary' === data.assertion ? fillForNegative : null
                return ui
            },

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
                var ui = setUiWithChildren(
                    data,
                    pad,
                    10,
                    'y'
                )
                ui.stroke = '#b7a'
                ui.fill = data.inclusive ? null : fillForNegative

                addNeighborArrows(data, pad)
                ui.neighborArrows.forEach(function(arrow) {
                    arrow.usesMarker = false
                })
                
                return ui
            },
            'Range of Chars': function() {
                var ui = setUiWithChildren(
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
            'Any Char': function() {
                var ui = setUiWithTextsOnly([data.type], data)
                ui.stroke = '#09d'
                ui.fill = data.inclusive === false ? fillForNegative : null
                return ui
            },
            'Specific Char': function() {
                var ui = setUiWithTextsOnly([data.display], data)
                ui.stroke = '#09d'
                ui.fill = data.inclusive === false ? fillForNegative : null
                return ui
            },
            'Reference': function() {
                var ui = setUiWithTextsOnly([data.type, data.number], data)
                ui.stroke = '#f9f374'
                ui.fill = data.isBack ? null : fillForNegative
                return ui
            }
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
