;(function(surfaceData) {
    'use strict'

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
        parentToken ~= {
            type: 'Foo',
            otherPropsForFoo: ...
            childTokens: [
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
        Returns parentToken.ui for convenience.

        Caller of setUiWithChildren is responsible for assigning info required
            for rendering both parentToken and fillers.
            E.g. fillers don't even have `.type`, and parentToken.ui doesn't have `.pos`.
    */
    function setUiWithChildren(
        parentToken,
        pad, /* {x: [n,n], y: [n,n]} -- where [n,n] are start and end paddings in that direction */
        intraMargin, /* spacing between children and fillers */
        dirPara, /* 'x' or 'y'. direction of expansion. */

        fillerDimPara, /* optional, needed iff using fillers.
            Dimension of fillers in the direction of expansion. */
        fillerDimOrtho /* optional even when using fillers.
            If falsy, fillers will all take up as much space as the largest child. */
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

        var children = surfaceData.getChildTokens(parentToken)

        if (! children.length) {
            return parentToken.ui = {
                dim: toCoord(
                    pad[dirPara][0] + pad[dirPara][1],
                    pad[dirOrtho][0] + pad[dirOrtho][1]
                ),
                fillers: []
            }
        }

        var parentUi = parentToken.ui = {}
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

                    var filler = {}
                    if (children[i - 1].textLoc && children[i].textLoc) {
                        // it's valid for child before or after to not have text loc. e.g. char range.
                        filler.textLoc = [
                            children[i - 1].textLoc[1],
                            children[i].textLoc[0]
                        ]
                    }
                    fillers.push(filler)
                    delayeds.push(function() {
                        var fillerPosOrtho = pad[dirOrtho][0] +
                            (fillerDimOrtho
                            ? (maxChildDimOrtho - fillerDimOrtho) / 2
                            : 0)
                        filler.pos = toCoord(fillerPosPara, fillerPosOrtho)
                        filler.dim = toCoord(fillerDimPara, fillerDimOrtho || maxChildDimOrtho)
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
        Add arrows between left and right neighbors and current token's vertically aligned children
            from (the left neighbor) to (every child)
            from (every child) to (the right neighbor)

        Each children already needs to have dim and pos assigned,
            e.g. using `setUiWithChildren`, or manually.
        
        Result is
        parentToken ~= {
            childTokens: [
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
    function addNeighborArrows(parentToken) {
        var childTokens = surfaceData.getChildTokens(parentToken)
        var parentUi = parentToken.ui

        var midY = parentUi.dim[1] / 2
        var onLeftEdge = [0, midY]
        var onRightEdge = [parentUi.dim[0], midY]

        var arrows = childTokens.length
            ? childTokens.reduce(function(allArrows, child, i) {
                var childUi = child.ui
                var childMidY = childUi.pos[1] + childUi.dim[1] / 2
                allArrows.push({
                    d: [
                        onLeftEdge,
                        [childUi.pos[0], childMidY]
                    ],
                    textLoc: child.textLoc
                        ? [child.textLoc[0], child.textLoc[0]]
                        : null,
                    fromLeft: true,
                    childIndex: i
                },
                {
                    d: [
                        [childUi.pos[0] + childUi.dim[0], childMidY],
                        onRightEdge
                    ],
                    textLoc: child.textLoc
                        ? [child.textLoc[1], child.textLoc[1]]
                        : null,
                    toRight: true,
                    childIndex: i
                })
                return allArrows
            }, [])
            : [{
                d: [
                    onLeftEdge,
                    onRightEdge
                ],
                textLoc: (function(pTextLoc) {
                    if (! pTextLoc) { return }
                    if (pTextLoc[0] === pTextLoc[1]) {
                        // eg parent is an empty alt
                        return pTextLoc
                    }
                    // eg parent is an empty char set
                    return [pTextLoc[0] + 1, pTextLoc[0] + 1]
                })(parentToken.textLoc),
                fromLeft: true,
                toRight: true
            }]
        arrows.forEach(function(arrow) {
            // boxed path needs pos and dim

            var start = arrow.d[0]
            var end = arrow.d[1]

            var pos = [
                Math.min(start[0], end[0]),
                Math.min(start[1], end[1])
            ]
            var dim = [
                Math.abs(end[0] - start[0]),
                Math.abs(end[1] - start[1])
            ]
            if (dim[1] < surfaceData.selectableArrowHeight) {
                // otherwise flat arrow wouldn't be selectable
                pos[1] -= ( (surfaceData.selectableArrowHeight - dim[1]) / 2 )
                dim[1] = surfaceData.selectableArrowHeight
            }

            function subtrPos(pt) {
                // create new arr, not mod.
                return [
                    pt[0] - pos[0],
                    pt[1] - pos[1]
                ]
            }
            arrow.type = 'boxed path'
            arrow.pos = pos
            arrow.dim = dim
            arrow.d = [subtrPos(start), subtrPos(end)]
        })
        parentUi.neighborArrows = arrows
    }

    /*
        Creates a textBlock.
        
        Does not assign it to an token. Hence caller must assign it,
            probably pushing it to `parentToken.ui.textBlocks`.
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
        token ~= {
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
        Returns token.ui, for convenience.
    */
    function setUiWithTextBlockOnly(contents, token) {
        var textBlock = getTextBlock(contents, token.textLoc)

        var pad = {h: 3, v: 1}
        textBlock.pos = [pad.h, pad.v]

        return token.ui = {
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
        token ~= {
            etc: ... // direct children of `token` are _never_ modified.
                Only `token.ui` is assigned.
                This keeps the assining of UI data idempotent.
                Hence `setUiData` can be applied multiple times to cloned
                (Object.create) copies of the same parser output to produce
                different environment-dependent ui data (e.g. pos and surfaceDim).
            childOrChildren:  ... // If there are any child or children, their
                `.ui` are also assigned. Usually this is done by recursively
                calling setUiByType or setUiWithChildren, respectively.
            ui: {
                dim: [n,n]
                etc: ...
            } // assigned by setUiByType
        }
        Returns token.ui, for convenience.

        Caller of setUiByType is responsible for assigning `token.ui.pos`.
    */
    function setUiByType(token) {
        var map = {
            'Pattern': function() {
                var ui = setUiWithChildren(
                    token,
                    {x: [0,0], y: [0,0]},
                    0,
                    'x'
                )
                ui.stroke = 'none'
                ui.fill = 'none'

                // make the left terminus have higher z-index than disj
                token.roots.push(token.roots.shift())

                // disj's neighborArrows ...
                token.roots[0].ui.neighborArrows.forEach(function(arrow) {
                    if (arrow.toRight) {
                        // remove markers from those funneling into the right terminus
                        arrow.usesMarkerEnd = false
                    }

                    // convert to cubic so they don't become hidden under long Alternatives in the middle
                    arrow.d = (function() {
                        var beginPt = arrow.d[0]
                        var endPt = arrow.d[1]
                        var ctrlPt = arrow.fromLeft
                            ? [beginPt[0],endPt[1]]
                            : [endPt[0], beginPt[1]]
                        return [
                            [
                                'M', beginPt,
                                surfaceData.cubic(ctrlPt, endPt, arrow.usesMarkerEnd !== false)
                            ].join(' '),
                            endPt
                        ]
                    })()
                })

                return ui
            },
            'Terminus': function() {
                return token.ui = {
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

                var ui = setUiWithChildren(
                    token,
                    pad,
                    5,
                    'y',
                    hrH
                )
                ui.stroke = 'none'

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

                if (token.mandatedDim) {
                    ;(function() {
                        // Special case. If disj's parent is a capturing group,
                        //     it dictates expansion of disj's right and bottom edges.
                        // Change disj's dim before drawing neighborArrows.
                        var padRExpansion = token.mandatedDim.minPadR - pad.x[1]
                        ui.dim[0] += Math.max(0, padRExpansion)

                        if (ui.dim[1] < token.mandatedDim.minH) {
                            ui.dim[1] = token.mandatedDim.minH
                        }
                    })()
                }

                addNeighborArrows(token)

                return ui
            },
            'Alternative': function() {
                var padH = token.terms.length ? 0 : 6
                    // make add/repl/deletable even if no terms
                var padV = surfaceData.selectableArrowHeight / 2
                var pad = {x: [padH,padH], y: [padV,padV]}
                var arrowW = 25
                var ui = setUiWithChildren(
                    token,
                    pad,
                    2,
                    'x',
                    arrowW,
                    surfaceData.selectableArrowHeight
                )
                ui.stroke = 'none'
                ui.fill = 'none'

                ui.fillers.forEach(function(filler) {
                    var midY = filler.dim[1] / 2
                    filler.type = 'boxed path',
                    filler.d = [
                        [0, midY],
                        [arrowW, midY]
                    ]
                })
                return ui
            },

            'Quantifier': function() {
                var texts = [
                    'min: ' + token.min,
                    'max: ' + (token.max === Infinity ? '\u221e' : token.max),
                    token.greedy ? 'Greedy' : 'Lazy'
                ]
                var ui = setUiWithTextBlockOnly(texts, token)
                ui.fill = '#fff8ea'
                ui.stroke = '#bbb'
                ui.strokeW = 1
                return ui
            },
            'Quantified': function() {
                var tUi = setUiByType(token.target)
                var myUi = token.ui = {
                    stroke: '#fb5'
                }

                var pad = {h: 30, v: 10}
                var intraMargin = pad.v
                    // gap between edges of target and arrows that run parallel to them outside them

                // determine target's and neighborArrows' pos, based on target dim.
                var arrowMidTopY, /* y where top arrow runs in the middle */
                    arrowMidBtmY, /* ditto bottom */
                    targetY,
                    maxChildY
                var btmArrowStyle = undefined
                if (token.quantifier.min) {
                    // term is at the top
                    targetY = pad.v
                    arrowMidTopY = targetY + tUi.dim[1] / 2
                    arrowMidBtmY = targetY + tUi.dim[1] + intraMargin

                    if (token.quantifier.min === 1 && token.quantifier.max === 1) {
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

                    if (token.quantifier.max === 1) {
                        btmArrowStyle = 'thru'
                    } else if (token.quantifier.max) {
                        btmArrowStyle = 'loop'
                    }
                }

                // position children, which are target and Quantifier.
                // set dim of Quantified.
                var myH
                ;(function() {
                    var qUi = setUiByType(token.quantifier)

                    var myW = pad.h * 2 + Math.max(tUi.dim[0], qUi.dim[0])
                    
                    tUi.pos = [
                        (myW - tUi.dim[0]) / 2,
                        targetY
                    ]
                    qUi.pos = [
                        (myW - qUi.dim[0]) / 2,
                        Math.max(maxChildY, qUi.dim[1]+ intraMargin) + intraMargin
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
                                            surfaceData.cubic(leftCtrlPtForTopArrow, offMidTopLeft),
                                            arc(1, r, -r),
                                            'L', atMidTopRight,
                                            arc(1, r, r),
                                            surfaceData.cubic(rightCtrlPtForTopArrow, overallRightPt, true)
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

                    // top arrow
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
                    // bottom arrow
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
                //     neighborArrows in target would be pointing the wrong way
                if (! token.quantifier.min && btmArrowStyle === 'loop') {
                    ;(function() {
                        var child = token.target
                        // note, Set of Chars is another possible type of child
                        // that requires touching on neighborArrows.
                        // but right now it does not use any.
                        if (child.type === 'Group') {
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

                var textBlock = getTextBlock([token.assertion], token.textLoc)
                textBlock.pos = [pad.x[0], pad.y[0]]

                var cUi = setUiByType(token.grouped)
                cUi.pos = [
                    pad.x[0],
                    textBlock.pos[1] + textBlock.dim[1] + intraMargin
                ]
                cUi.fill = 'white' // override 'none' so that user can highlight disj
                cUi.stroke = '#888' // otherwise normally disj has stroke 'none'
                cUi.strokeW = 1
                cUi.neighborArrows.length = 0 // disj should not be connected with the rest of the flow

                return token.ui = {
                    dim: [
                        pad.x[0] + Math.max(textBlock.dim[0], cUi.dim[0]) + pad.x[1],
                        cUi.pos[1] + cUi.dim[1] + pad.y[1]
                    ],
                    textBlocks: [textBlock],
                    stroke: '#f9f374',
                    fill: /^Pos/.test(token.assertion) ? null : surfaceData.fillForNegative
                }
            },
            'Assertion': function() {
                var ui = setUiWithTextBlockOnly(token.assertion.split(' '), token)
                ui.stroke = '#f9f374'
                ui.fill = token.atWb === false ? surfaceData.fillForNegative : null
                return ui
            },

            'Group': function() {
                var tbPad = 3
                var tb
                if (typeof token.number === 'number') {
                    tb = getTextBlock([
                        '#' + token.number
                    ], token.textLoc)

                    // provide mandated dim to disj before setUiByType call
                    token.grouped.mandatedDim = {
                        minPadR: tbPad * 2 + tb.dim[0],
                        minH: (tbPad * 2 + tb.dim[1]) * 2
                    }
                }

                var pad = {h: 14, v: 14}
                var cUi = setUiByType(token.grouped)
                cUi.pos = [pad.h, pad.v]
                cUi.stroke = '#D6F099'

                var ui = token.ui = {
                    dim: [
                        pad.h * 2 + cUi.dim[0],
                        pad.v * 2 + cUi.dim[1]
                    ],
                    stroke: '#7a0'
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
                var ui = setUiWithChildren(
                    token,
                    {x: [24,24], y: [10,10]},
                    10,
                    'y'
                )
                ui.stroke = '#b7a'
                ui.fill = token.inclusive ? 'white' : surfaceData.fillForNegative

                var addReplW = 14
                var h = surfaceData.selectableArrowHeight
                var boxY = (ui.dim[1] - h) / 2
                var arrowY = h / 2
                if (token.possibilities.length) {
                    if (! token.nonSemantic && ! token.predefinedDisplay) {
                        // add targets for add/replace within set.
                        // innerTextLoc can be falsy if token came from creator
                        ui.neighborArrows = [{
                            pos: [0, boxY],
                            textLoc: token.innerTextLoc
                                ? [token.innerTextLoc[0], token.innerTextLoc[0]]
                                : null
                        },{
                            pos: [ui.dim[0] - addReplW, boxY],
                            textLoc: token.innerTextLoc
                                ? [token.innerTextLoc[1], token.innerTextLoc[1]]
                                : null
                        }]
                        ui.neighborArrows.forEach(function(arrow) {
                            arrow.type = 'boxed path'
                            arrow.dim = [addReplW, h]
                            arrow.d = [
                                [0, arrowY],
                                [addReplW, arrowY]
                            ]
                        })
                    }
                } else {
                    addNeighborArrows(token) // allow adding into [] or [^]
                }

                return ui
            },
            'Range of Chars': function() {
                var linkH = 15
                var ui = setUiWithChildren(
                    token,
                    {x: [10,10], y: [10,10]},
                    0,
                    'y',
                    linkH
                )
                ui.stroke = '#f77'
                ui.fill = token.inclusive === false ? surfaceData.fillForNegative : null

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
                var ui = setUiWithTextBlockOnly([token.type], token)
                ui.stroke = '#09d'
                ui.fill = token.inclusive === false ? surfaceData.fillForNegative : null
                return ui
            },
            'Specific Char': function() {
                var ui = setUiWithTextBlockOnly([token.display], token)
                ui.stroke = '#09d'
                ui.fill = token.inclusive === false ? surfaceData.fillForNegative : null
                return ui
            },
            'Reference': function() {
                // accommodating mockToken by tokenCreator which does not know whether back/fwd
                var dir = typeof token.isBack === 'boolean'
                    ? token.isBack
                        ? 'Back' : 'Forward'
                    : ''
                var ui = setUiWithTextBlockOnly(
                    [dir, token.type, 'To #' + token.number], token)
                ui.stroke = '#f9f374'
                ui.fill = dir === 'Forward' ? surfaceData.fillForNegative : null
                return ui
            },
            'Any Other Char': function() {
                var ui = setUiWithTextBlockOnly(['Any', 'Other'], token)
                ui.fill = 'none'
                return ui
            }
        } // end of var map

        var fn = map[token.type]
        if (fn) {
            return fn()
        } else {
            console.error('could not determine how to set ui data', token)
        }
    } // end of fn setUiByType

    /*
        Assigns all info required for rendering the root component.
        See `setUiByType`.
    */
    surfaceData.setUiData = function(token) {
        var rootPad = 10
        var dUi = setUiByType(token)
        dUi.pos = [rootPad, rootPad]
        dUi.surfaceDim = [
            rootPad * 2 + dUi.dim[0],
            rootPad * 2 + dUi.dim[1]
        ]
    }

})(window.surfaceData = window.surfaceData || {})
