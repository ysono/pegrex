;(function(reactClasses) {
    'use strict'

    /* standardize the y of arrows between terms.
        A oneChar term is the smallest in height as well as likely most frequently seen.
        Its height is always 32; div this in half.
    */
    var interTermArrowY = 16

    /* setUiOnCompoWithChildren:
        requires setUiByType
        1) call setUiByType on all children -> now they each have dim
        2) gather all dims of children -> set pos of children, and dim/pos of fillers
        3) based on dim/pos of the farthest child -> set parentData's dim
    */
    function setUiOnCompoWithChildren(
        parentData,

        childrenProp, /* parentData[childrenProp] contains an array of children */
        pad, /* {x: [n,n], y: [n,n]} -- where [n,n] are start and end paddings in that direction */
        intraMargin, /* spacing between a child and a filler */
        dirPara, /* 'x' or 'y' */

        /* below is required if fillers are used between children */
        fillerDim /* {x: n, y: n} -- dimension of filler. the orthogonal dim can be 0 as a placeholder. */
        ) {

        var dirOrtho = dirPara === 'x' ? 'y' : 'x'

        function readCoord(coord, dir) {
            var i = dir === 'x' ? 0 : 1
            return coord[i]
        }
        function toCoord(para, ortho) {
            if (dirPara === 'x') {
                return [para, ortho]
            } else {
                return [ortho, para]
            }
        }

        // this pair of vars indicate the farthest point being occupied by children or filler
        var maxPara = pad[dirPara][0] - intraMargin
        var maxOrtho = 0

        var fillers = []
        parentData[childrenProp].forEach(function(child, i) {
            if (fillerDim && i) {
                (function() {
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

            var cUi = setUiByType(child)
            var cPosPara = maxPara + intraMargin
            var cPosOrtho = pad[dirOrtho][0]

            cUi.pos = toCoord(cPosPara, cPosOrtho)

            maxPara = cPosPara + readCoord(cUi.dim, dirPara)
            maxOrtho = Math.max(maxOrtho, cPosOrtho + readCoord(cUi.dim, dirOrtho))
        })

        return parentData.ui = {
            dim: toCoord(
                maxPara + pad[dirPara][1],
                maxOrtho + pad[dirOrtho][1]
            ),
            fillers: fillerDim ? fillers : undefined
        }
    }

    /* setUiByType:
        Sets and returns data.ui.dim
        Does not set data.ui.pos
        If data contains children, recursively sets their .ui.dim and .ui.pos.
    */
    function setUiByType(data) {
        function oneChar() {
            return data.ui = {
                dim: (function() {
                    var lnH = 16 // 1em
                    var charW = 8 // .5em
                    return [
                        charW * Math.max(data.type.length, data.display.length),
                        lnH * 2
                    ]
                })()
            }
        }

        var map = {
            'Disjunction': function() {
                var pad = {x: [10,10], y: [10,10]}
                var ui = setUiOnCompoWithChildren(
                    data,

                    'alternatives',
                    pad,
                    5,
                    'y',

                    {x: 0, y: 30}
                )
                // set hr width as maximal width of alternatives
                var hrW = ui.dim[0] - pad.x[0] - pad.x[1]
                ui.fillers.forEach(function(hr) {
                    hr.type = 'hr'
                    hr.dim[0] = hrW
                })
                return ui
            },
            'Alternative': function() {
                var ui = setUiOnCompoWithChildren(
                    data,

                    'terms',
                    {x: [10,10], y: [10,10]},
                    5,
                    'x',

                    {x: 40, y: 0}
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

                var pad = {h: 40, v: 10}
                var arrowEdgeY = interTermArrowY
                var intraMargin = 10 // between top/btm edge of target and the arrow that doesn't go thru it

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
                    arrowMidBtmY = targetY + tUi.dim[1] / 2
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
                        var r = 10
                        function arc(clockwise, dx,dy) {
                            return ['a',r,r,0,0,clockwise,dx,dy].join(' ')
                        }
                        var jointLeftX = pad.h / 3
                        var jointRightX = myUi.dim[0] - jointLeftX

                        var detourArrow
                        if (data.quantifier.min === 0 && data.quantifier.max === 1) {
                            // left edge -> down -> right -> up -> right edge
                            detourArrow = (function() {
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
                            detourArrow = (function() {
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
                        myUi.arrows.push(detourArrow)
                    })()
                }
                myUi.arrows.forEach(function(arrow) {
                    arrow.type = 'path'
                })

                return myUi
            },
            'Group': function() {
                var pad = {h: 10, v: 10}
                var cUi = setUiByType(data.grouped)
                cUi.pos = [pad.h, pad.v]
                return data.ui = {
                    dim: [
                        cUi.dim[0] + pad.h * 2,
                        cUi.dim[1] + pad.v * 2
                    ]
                }
            },
            'Set of Chars': function() {
                var pad = {x: [30,30], y: [10,10]}
                var ui = setUiOnCompoWithChildren(
                    data,

                    'possibilities',
                    pad,
                    10,
                    'y'
                )

                var leftArrowBegin = [0, interTermArrowY]
                var rightArrowEnd = function() {
                    // return a fresh copy b/c it's modified later to adjust for marker
                    return [ui.dim[0], interTermArrowY]
                }
                ui.arrows = data.possibilities.reduce(function(allArrows, possib) {
                    var subUi = possib.ui
                    var subUiYMid = subUi.pos[1] + subUi.dim[1] / 2

                    var left = {
                        type: 'path',
                        d: [
                            leftArrowBegin,
                            [subUi.pos[0], subUiYMid]
                        ]
                    }
                    var right = {
                        type: 'path',
                        d: [
                            [subUi.pos[0] + subUi.dim[0], subUiYMid],
                            rightArrowEnd()
                        ]
                    }
                    return allArrows.concat(left, right)
                }, [])
                return ui
            },
            'Range of Chars': function() {
                var ui = setUiOnCompoWithChildren(
                    data,

                    'range',
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
                return ui
            },
            'Any Char': oneChar,
            'Specific Char': oneChar
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
})(window.reactClasses = window.reactClasses || {})
