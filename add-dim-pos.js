;(function(reactClasses) {

    // requires setUi
    /* setUiOnChildren:
        1) call setUi on all children -> now they each have dim
        2) gather all dims of children -> set pos of children, and dim/pos of fillers
        3) based on dim/pos of the farthest child -> set parentData's dim
    */
    function setUiOnChildren(
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

            var cUi = setUi(child)
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


    /* setUi:
        Sets and returns data.ui.dim
        Does not set data.ui.pos
        If data contains children, recursively sets their .ui.dim and .ui.pos.
    */
    function setUi(data) {
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
                var ui = setUiOnChildren(
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
                var ui = setUiOnChildren(
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
                var ui = setUiOnChildren(
                    data,

                    'possibilities',
                    pad,
                    10,
                    'y'
                )

                var arrowY = 16 // b/c height of `oneChar` is 32
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
        }
        return map[data.type]()
    }
    reactClasses.addDimPos = function(data) {
        var pad = {t:10,r:10,b:10,l:10}

        var dUi = setUi(data)
        
        dUi.pos = [pad.l,pad.t]
        data.ui.svgDim = [
            pad.t + dUi.pos[0] + dUi.dim[0] + pad.b,
            pad.l + dUi.pos[1] + dUi.dim[1] + pad.r
        ]
    }
})(window.reactClasses = window.reactClasses || {})
