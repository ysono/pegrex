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
    /*
        Locate children for a generic component.
    */
    surfaceData.getChildVal = function(data) {
        var prop = typeToChildProp[data.type]
        if (typeof prop === 'string') {
            return data[prop]
        }
        if (prop instanceof Array) {
            return prop.reduce(function(vals, prop) {
                return vals.concat(data[prop] || [])
            }, [])
        }
        // else return undefined
    }

    /*
        Center-aligns the given component's children.
        Determines overall dimensions and positions only.

        Conceptually,
        1) Call setUiByType on all children -->
            now children each have dim
        2) Gather all dims of children -->
            assign pos on children
            assign pos and dim on parent's fillers
        3) Based on dim/pos of the farthest child -->
            assign dim on parent
            not assigning pos on parent

        Result is
        parentData ~= {
            type: 'Foo',
            otherPropsForFoo: ...
            theChildren: [
                {
                    type: 'Bar',
                    otherPropsForBar: ...
                    ui: {
                        dim: [n,n] // assigned by nested call of setUiByType
                        otherUiSpecsForBar: ... // assigned by nested call of setUiByType

                        pos: [n,n] // assigned by setUiWithChildren
                    } // assigned by nested call of setUiByType
                }
            ] // the children has to be an array
            ui: {
                dim: [n,n]
                fillers: [
                    // 0 or more fillers are added
                    {
                        dim: [n,n]
                        pos: [n,n]
                        textLoc: [n,n] // from end of child before filler to beginning of child after.
                            // unles parser is screwed up, the two nums should be equal.
                    }
                ]
            } // assigned by setUiWithChildren
        }
        Returns parentData.ui for convenience.

        Caller of setUiWithChildren is responsible for assigning info required
            for rendering both parentData and fillers.
            E.g. fillers don't even have `.type`, and parentData.ui doesn't have `.pos`.
    */
    function setUiWithChildren(
        parentData,
        pad, /* {x: [n,n], y: [n,n]} -- where [n,n] are start and end paddings in that direction */
        intraMargin, /* spacing between children and fillers */
        dirPara, /* 'x' or 'y'. direction of expansion. */

        fillerDimPara /* optional, needed iff using fillers.
            Dimension of fillers in the direction of expansion.
            Their dimension in the other direction will equal to that of the largest child */
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
                    if (children[i - 1].textLoc && children[i].textLoc) {
                        // it's valid for child before or after to not have text loc. e.g. char range.
                        filler.textLoc = [
                            children[i - 1].textLoc[1],
                            children[i].textLoc[0]
                        ]
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
        Add arrows between left and right neighbors and current data's vertically aligned children
            from (the left neighbor) to (every child)
            from (every child) to (the right neighbor)

        Each children already needs to have dim and pos assigned,
            e.g. using `setUiWithChildren`, or manually.
        
        Result is
        parentData ~= {
            theChildren: [
                // the given children need to be an array of 0 or more objs
            ]
            etc: ...
            ui: {
                etc: ...

                neighborArrows: [
                    // 1 or more arrows are added
                    {
                        type: 'path',
                        d: ...
                    }
                ] // assigned by addNeighborArrows
            }
        }
    */
    function addNeighborArrows(parentData) {
        var children = surfaceData.getChildVal(parentData)
        var parentUi = parentData.ui

        var midY = parentUi.dim[1] / 2
        var leftBegin = [0, midY]
        var rightEnd = [parentUi.dim[0], midY]
        parentUi.neighborArrows = children.length
            ? children.reduce(function(allArrows, child, i) {
                var childUi = child.ui
                var childMidY = childUi.pos[1] + childUi.dim[1] / 2
                allArrows.push({
                    type: 'path',
                    d: [
                        leftBegin,
                        [childUi.pos[0], childMidY]
                    ],
                    fromLeft: true,
                    childIndex: i
                },
                {
                    type: 'path',
                    d: [
                        [childUi.pos[0] + childUi.dim[0], childMidY],
                        rightEnd
                    ],
                    toRight: true,
                    childIndex: i
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
        Creates a textBlock.
        
        Does not assign it to an component data. Hence caller must assign it,
            probably pushing it to `theParentData.ui.textBlocks`.
            (For doc on the list of props that are read, see `boxedClass`.)

        Caller is responsible for assigning pos to the returned obj,
            and complete any other necessary info.

        If the parent component has textLoc, it's recommend to copy it over here.
            (See fn `hiliteSelected` for explanation.)
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
    /*
        Assigns all info required for rendering a component that has
            rows of texts (one textBlock) and nothing else.

        Result is
        data ~= {
            etc: ...
            ui: {
                dim: [n,n],
                textBlocks: [
                    // one textBlock is added
                    {
                        type: 'textBlock'
                        etc: ... see fn `getTextBlock`
                    }
                ]
            } // assigned by setUiWithTextBlockOnly
        }
        Returns data.ui, for convenience.
    */
    function setUiWithTextBlockOnly(contents, data) {
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
        Assigns all info required for rendering the given component
            and its children, if any.
            That is, all except the positioning of the given component.

        Result is
        data ~= {
            etc: ... // non-ui data may be modified
            someSingleChild: // assigned e.g. by calling setUiByType
            someArrayOfChildren: // assigned e.g. by calling setUiWithChildren
            ui: {
                dim: [n,n]
                etc: ...
            } // assigned by setUiByType
        }
        Returns data.ui, for convenience.

        Caller of setUiByType is responsible for assigning `data.ui.pos`.
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

                // remove markers from disj's neighborArrows funneling into the right terminus
                data.roots[0].ui.neighborArrows.forEach(function(arrow) {
                    if (arrow.toRight) {
                        arrow.usesMarkerEnd = false
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

                // modifying parser output here!!
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
                    hr.usesMarkerEnd = false
                    hr.stroke = '#ddd'
                })

                if (data.mandatedDim) {
                    ;(function() {
                        // Special case. If disj's parent is a capturing group,
                        //     it dictates expansion of disj's right and bottom edges.
                        // Change disj's dim before drawing neighborArrows.
                        var padRExpansion = data.mandatedDim.minPadR - pad.x[1]
                        ui.dim[0] += Math.max(0, padRExpansion)

                        if (ui.dim[1] < data.mandatedDim.minH) {
                            ui.dim[1] = data.mandatedDim.minH
                        }
                    })()
                }

                addNeighborArrows(data)

                return ui
            },
            'Alternative': function() {
                var pad = {x: [0,0], y: [0,0]}
                var arrowW = 25
                var ui = setUiWithChildren(
                    data,
                    pad,
                    2,
                    'x',
                    arrowW
                )
                ui.stroke = 'none'
                ui.fill = 'none'

                var midY = ui.dim[1] / 2 - pad.y[0]
                ui.fillers.forEach(function(arrow) {
                    arrow.type = 'path'
                    arrow.d = [
                        [0, midY],
                        [arrowW, midY]
                    ]
                })
                return ui
            },

            'Quantifier': function() {
                var texts = [
                    'min: ' + data.min,
                    'max: ' + (data.max === Infinity ? '\u221e' : data.max),
                    data.greedy ? 'Greedy' : 'Lazy'
                ]
                var ui = setUiWithTextBlockOnly(texts, data)
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

                // position children, which are target and Quantifier
                // set dim of parent (Quantified)
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
                        Math.max(maxChildY, qUi.dim[1]) + intraMargin
                        // Reason for Math.max: want the quantifier to be
                        // below the mid vertical point b/c otherwise
                        // e.g. `x*` is so narrow horizontally that
                        // quantifier overlaps arrows.
                    ]

                    myH = qUi.pos[1] + qUi.dim[1] + pad.v
                    myUi.dim = [myW, myH]
                })()

                // add neighborArrows
                ;(function() {
                    var overallLeftPt = [0, myH / 2]
                    var overallRightPt = [myUi.dim[0], myH / 2]
                    var atMidTopLeft = [tUi.pos[0], arrowMidTopY]
                    var atMidTopRight = [tUi.pos[0] + tUi.dim[0], arrowMidTopY]

                    if (btmArrowStyle === 'loop') {
                        ;(function() {
                            var r = intraMargin
                            var offMidTopLeft = [atMidTopLeft[0] - r, atMidTopLeft[1] + r]
                            var offMidTopRight = [atMidTopRight[0] + r, atMidTopRight[1] + r]
                            var leftCtrlPtForTopArrow = [offMidTopLeft[0], overallLeftPt[1]]
                            var rightCtrlPtForTopArrow = [offMidTopRight[0], overallRightPt[1]]
                            function arc(clockwise, dx,dy) {
                                return ['a',r,r,0,0,clockwise,dx,dy].join(' ')
                            }
                            myUi.neighborArrows = [
                                {
                                    // the thru arrow at the top
                                    type: 'path',
                                    d: [
                                        [
                                            'M', overallLeftPt,
                                            'C', leftCtrlPtForTopArrow, leftCtrlPtForTopArrow, offMidTopLeft,
                                            arc(1, r, -r),
                                            'L', atMidTopRight,
                                            arc(1, r, r),
                                            'C', rightCtrlPtForTopArrow, rightCtrlPtForTopArrow,
                                                overallRightPt[0] - surfaceData.markerLen - .01, overallRightPt[1]
                                                // here, hacking so marker points horizontally to the right.
                                        ].join(' '),
                                        overallRightPt
                                    ]
                                },
                                {
                                    // detour arrow at the bottom.
                                    // right of target -> down -> left -> up -> left of target
                                    type: 'path',
                                    d: [
                                        [
                                            'M', offMidTopRight,
                                            'L', atMidTopRight[0] + r, arrowMidBtmY - r,
                                            arc(1, -r, r),
                                            'L', atMidTopLeft[0], arrowMidBtmY,
                                            arc(1, -r, -r),
                                            'L', atMidTopLeft[0] - r, atMidTopLeft[1] + r
                                        ].join(' ')
                                    ],
                                    usesMarkerEnd: false
                                }
                            ]
                        })()
                        return
                    }

                    // the thru arrow at the top
                    myUi.neighborArrows = [{
                        type: 'path',
                        d: [
                            overallLeftPt,
                            atMidTopLeft,
                            atMidTopRight,
                            overallRightPt
                        ].filter(function(coord) {
                            return coord
                        })
                    }]
                    // detour arrow at the bottom
                    if (btmArrowStyle === 'thru') {
                        myUi.neighborArrows.push({
                            type: 'path',
                            d: [
                                overallLeftPt,
                                [tUi.pos[0], arrowMidBtmY],
                                [tUi.pos[0] + tUi.dim[0], arrowMidBtmY],
                                overallRightPt
                            ]
                        })
                    }
                })()

                // if target is at the bottom and bottom arrow is looping,
                //     neighborArrows in target would be pointing the wrong way,
                if (! data.quantifier.min && btmArrowStyle === 'loop') {
                    ;(function() {
                        var child = data.target
                        if (child.type === 'Set of Chars') {
                            // b/e within a set, the path goes thru only one char,
                            // eliminating directinality is sufficient.
                            // (Set of Chars already eliminates arrowheads
                            // to avoid visual cluttering, but keep code in here
                            // for clarity.)
                            tUi.neighborArrows.forEach(function(arrow) {
                                arrow.usesMarkerEnd = false
                            })
                        } else if (child.type === 'Group') {
                            // there is no easy way to correct them, so simply remove them
                            child.grouped.ui.neighborArrows.length = 0
                        }
                    })()
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
                cUi.fill = 'white' // override 'none' so that user can highlight disj
                cUi.stroke = '#888' // otherwise normally disj has stroke 'none'
                cUi.strokeW = 1
                cUi.neighborArrows.length = 0 // disj should not be connected with the rest of the flow

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
                var ui = setUiWithTextBlockOnly([data.assertion], data)
                ui.stroke = '#f9f374'
                ui.fill = 'Non-Word Boundary' === data.assertion ? fillForNegative : null
                return ui
            },

            'Group': function() {
                var tbPad = 3
                var tb
                if (typeof data.number === 'number') {
                    tb = getTextBlock([
                        '#' + data.number
                    ], data.textLoc)

                    // provide mandated dim to disj before setUiByType call
                    data.grouped.mandatedDim = {
                        minPadR: tbPad * 2 + tb.dim[0],
                        minH: (tbPad * 2 + tb.dim[1]) * 2
                    }
                }

                var pad = {h: 0, v: 0}
                var cUi = setUiByType(data.grouped)
                cUi.pos = [pad.h, pad.v]

                var ui = data.ui = {
                    dim: [
                        pad.h * 2 + cUi.dim[0],
                        pad.v * 2 + cUi.dim[1]
                    ],
                    stroke: '#fb5'
                }

                if (tb) {
                    tb.pos = [
                        ui.dim[0] - tbPad - tb.dim[0],
                        ui.dim[1] - tbPad - tb.dim[1]
                    ]
                    ui.textBlocks = [tb]
                }

                return ui
            },
            'Set of Chars': function() {
                var pad = {x: [30,30], y: [10,10]}
                var intraMargin = 10
                var ui = setUiWithChildren(
                    data,
                    pad,
                    intraMargin,
                    'y'
                )
                ui.stroke = '#b7a'

                if (! data.inclusive) {
                    ;(function() {
                        // creating a comonent obj with no type
                        // no type --> rendered by `boxedClass` class
                        var tb = {
                            inclusive: true
                        }
                        var tbUi = setUiWithTextBlockOnly([
                            'Any', 'Other'
                        ], tb)
                        tbUi.pos = [
                            (ui.dim[0] - tbUi.dim[0]) / 2,
                            ui.dim[1] - pad.y[1] + intraMargin
                        ]
                        tbUi.stroke = '#888'
                        tbUi.strokeW = 1

                        // looks like 'Other' is short enough that we don't have to readjust parent ui width
                        ui.dim[1] += (intraMargin + tbUi.dim[1])

                        // modifying parser output here!!
                        // Adding the compo to `data.possibilities`
                        //     rather than to `data.ui.textBlocks`
                        //     for the convenience of creating neighborArrows
                        data.possibilities.push(tb)
                    })()
                }

                addNeighborArrows(data)
                ui.neighborArrows.forEach(function(arrow) {
                    arrow.usesMarkerEnd = false // b/c it looks cluttered

                    if (typeof arrow.childIndex === 'number') {
                        var child = data.possibilities[arrow.childIndex]
                        // don't cross out line going to nested set, which is a predefined set
                        //     b/c it has "Any Other" as whitelist
                        if (child && child.type !== 'Set of Chars') {
                            arrow.usesMarkerMid = ! child.inclusive
                        }
                    } else {
                        // arrow.childIndex is undefined
                        // b/c there is only one arrow
                        // b/c there is zero child
                        // b/c this is an inclusive Set of Chars with zero possibilities.
                        // Then, nothing to do.
                    }
                })

                return ui
            },
            'Range of Chars': function() {
                var linkH = 15
                var ui = setUiWithChildren(
                    data,
                    {x: [10,10], y: [10,10]},
                    0,
                    'y',
                    linkH
                )
                ui.stroke = '#f77'
                ui.fill = data.inclusive ? null : fillForNegative

                var link = ui.fillers[0]
                link.type = 'path'
                link.d = [
                    [link.dim[0] / 2, 0],
                    [link.dim[0] / 2, linkH]
                ]
                link.isVertical = true
                link.usesMarkerEnd = false

                return ui
            },
            'Any Char': function() {
                var ui = setUiWithTextBlockOnly([data.type], data)
                ui.stroke = '#09d'
                ui.fill = data.inclusive === false ? fillForNegative : null
                return ui
            },
            'Specific Char': function() {
                var ui = setUiWithTextBlockOnly([data.display], data)
                ui.stroke = '#09d'
                ui.fill = data.inclusive === false ? fillForNegative : null
                return ui
            },
            'Reference': function() {
                var ui = setUiWithTextBlockOnly(
                    [data.type, 'To #' + data.number], data)
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
        Assigns all info required for rendering the root component.
        See `setUiByType`.
    */
    surfaceData.addUiData = function(data) {
        var rootPad = 10
        var dUi = setUiByType(data)
        dUi.pos = [rootPad, rootPad]
        dUi.surfaceDim = [
            rootPad * 2 + dUi.dim[0],
            rootPad * 2 + dUi.dim[1]
        ]
    }

})(window.surfaceData = window.surfaceData || {})
