;(function(reactClasses) {

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

    /*
        given data ~= {
            type: 'Foo',
            // other props of type Foo

            quantifier: {
                min
                max
                // other props of quantifier
            }
        }
        return {
            type: 'Quantified' // ui-only type
            quantifier: {
                min
                max
                // other props of quantifier
            }
            target: {
                type: 'Foo',
                // other props of type Foo
            }
        }

        Do the conversion here rather than parser b/c complication with escaped decimals
    */
    function setUiOnQuantifiedCompo(data) {
        debugger
        var tUi
        var myUi
        (function() {
            // Can't use Object.create, or else data.target.target....
            var target = Object.keys(data).reduce(function(clone, key) {
                if (key === 'quantifier') {
                    return clone
                }
                clone[key] = data[key]
                delete data[key]
                return clone
            }, {})
            data.target = target
            tUi = setUiByType(target)

            myUi = data.ui = {}

            data.type = 'Quantified'
        })()

        var pad = {h: 40, v: 10}
        var interArrowH = tUi.dim[1] / 2 + 10

        tUi.pos = [
            pad.h,
            pad.v + (data.quantifier.min ? 0 : interArrowH)
        ]
        myUi.dim = [
            pad.h * 2 + tUi.dim[0],
            tUi.pos[1] + tUi.dim[1] + pad.v
        ]

        // TODO how much of below should go to react class itself?
        // TODO need to show min,max
        
        var edgeArrowY = 16
        var targetMidY = pad.v + tUi.dim[1] / 2
        
        // straight arrow at the top
        // TOOD for {0,0}, break shows
        myUi.arrows = [{
            begin: [0, edgeArrowY],
            end: [tUi.pos[0], targetMidY]
        }, {
            begin: [tUi.pos[0] + tUi.dim[0], targetMidY],
            end: [myUi.dim[0], edgeArrowY]
        }]
        // detour arrow at the bottom
        ;(function() {
            var r = 5
            function arc(clockwise, dx,dy) {
                return ['a',r,r,0,0,clockwise,dx,dy].join(' ')
            }
            var detourLPt = [pad.h / 2, targetMidY]
            var detourRPt = [myUi.dim[0] - pad.h / 2, detourLPt[1]]
            var detourLBtmPt = [detourLPt[0], detourLPt[1] + interArrowH]
            var detourRBtmPt = [detourRPt[0], detourLBtmPt[1]]

            var quantifier = data.quantifier

            if ([0,1].indexOf(quantifier.min) >= 0 &&
                quantifier.min === quantifier.max) {
                // no detour line
                return
            }

            var detourArrow
            if (quantifier.min === 0 && quantifier.max === 1) {
                // left of parent -> down -> right -> up -> right of parent
                detourArrow = {
                    d: [
                        'M', 0, detourLPt[1],
                        'L', detourLPt[0] - r, detourLPt[1],
                        arc(1, r, r),
                        'L', detourLBtmPt[0], detourLBtmPt[1] - r,
                        arc(0, r, r),
                        'L', detourRBtmPt[0] - r, detourRBtmPt[1],
                        arc(0, r, -r),
                        'L', detourRPt[0], detourRPt[1] + r,
                        arc(1, r, -1*r)
                    ].join(' '),
                    end: [myUi.dim[0], detourLPt[1]]
                }
            } else {
                // right of target -> down -> left -> up -> left of parent
                detourArrow = {
                    d: [
                        'M', tUi.pos[0] + tUi.dim[0], detourRPt[1],
                        'L', detourRPt[0] - r, detourRPt[1],
                        arc(1, r, r),
                        'L', detourRBtmPt[0], detourRBtmPt[1] - r,
                        arc(1, -1*r, r),
                        'L', detourLBtmPt[0] + r, detourLBtmPt[1],
                        arc(1, -1*r, -1*r),
                        'L', detourLPt[0], detourLPt[1] + r,
                        arc(1, r, -1*r)
                    ].join(' '),
                    end: [tUi.pos[0], detourLPt[1]]
                }
            }
            myUi.arrows.push(detourArrow)

            // readjust my height
            myUi.dim[1] = Math.max(myUi.dim[1], detourLBtmPt[1] + pad.v)
        })()

        return myUi
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
                    hr.dim[0] = hrW
                })
                return ui
            },
            'Alternative': function() {
                var arrowH = 32 // b/c height of `oneChar` is 32
                var ui = setUiOnCompoWithChildren(
                    data,

                    'terms',
                    {x: [10,10], y: [10,10]},
                    5,
                    'x',

                    {x: 40, y: arrowH}
                )
                ui.fillers.forEach(function(arrow) {
                    arrow.begin = [0, arrowH / 2]
                    arrow.end = [arrow.dim[0], arrowH / 2]
                })
                return ui
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

                var arrowY = 16 // b/c height set by `oneChar` is 32
                var leftArrowBegin = [0, arrowY]
                var rightArrowEnd = function() {
                    // return a fresh copy b/c it's modified later to adjust for marker
                    return [ui.dim[0], arrowY]
                }
                ui.arrows = data.possibilities.reduce(function(allArrows, possib) {
                    var subUi = possib.ui
                    var subUiYMid = subUi.pos[1] + subUi.dim[1] / 2

                    var left = {
                        pos: [0,0],
                        begin: leftArrowBegin,
                        end: [subUi.pos[0], subUiYMid]
                    }
                    var right = {
                        pos: [0,0],
                        begin: [subUi.pos[0] + subUi.dim[0], subUiYMid],
                        end: rightArrowEnd()
                    }
                    return allArrows.concat(left, right)
                }, [])
                return ui
            },
            'Any Char': oneChar,
            'Specific Char': oneChar
        } // end of var map

        if (data.quantifier) {
            return setUiOnQuantifiedCompo(data)
        }
        return map[data.type]()
    }
    reactClasses.addDimPos = function(data) {
        var pad = {t:10,r:10,b:10,l:10}

        var dUi = setUiByType(data)
        dUi.pos = [pad.l,pad.t]
        dUi.svgDim = [
            pad.t + dUi.pos[0] + dUi.dim[0] + pad.b,
            pad.l + dUi.pos[1] + dUi.dim[1] + pad.r
        ]
    }
})(window.reactClasses = window.reactClasses || {})
