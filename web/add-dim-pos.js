;(function(reactClasses) {
    function setUi(data) {
        function oneChar() {
            return data.ui = {
                dim: (function() {
                    var lnH = 16 // 1em
                    var charW = 12 // arbitrary
                    return [
                        charW * Math.max(data.type.length, data.display.length),
                        lnH * 2
                    ]
                })()
            }
        }
        var map = {
            'Specific Char': oneChar,
            'Any Char': oneChar,
            'Alternative': function() {
                var pad = {t:10,r:10,b:10,l:10}
                var marginChildrenHor = 20
                
                var arrowW = 50
                var arrowH = 32 // min h of terms
                var arrowMarkerW = 12

                var maxChildXW = pad.l - marginChildrenHor
                var maxChildH = 0

                data.arrows = []
                data.terms.forEach(function(t, i) {
                    var arrow
                    if (i) {
                        arrow = {
                            dim: [
                                arrowW, arrowH
                            ],
                            pos: [
                                maxChildXW + marginChildrenHor,
                                pad.t
                            ],
                            markerW: arrowMarkerW
                        }
                        data.arrows.push(arrow)
                        maxChildXW = arrow.pos[0] + arrow.dim[0]
                        maxChildH = Math.max(maxChildH, arrow.pos[1] + arrow.dim[1])
                    }

                    var tUi = setUi(t)
                    tUi.pos = [
                        maxChildXW + marginChildrenHor,
                        pad.t
                    ]
                    maxChildXW = tUi.pos[0] + tUi.dim[0]
                    maxChildH = Math.max(maxChildH, tUi.pos[1] + tUi.dim[1])
                })

                return data.ui = {
                    dim: [
                        maxChildXW + pad.r,
                        maxChildH + pad.b
                    ]
                }
            },
            'Disjunction': function() {
                var pad = {t:10,r:10,b:10,l:10}
                var marginChildrenVer = 5

                var hrH = 30

                var maxChildW = 0
                var maxChildYH = pad.t - marginChildrenVer

                data.hrs = []
                data.alternatives.forEach(function(alt ,i) {
                    var hr
                    if (i) {
                        hr = {
                            pos: [
                                pad.l,
                                maxChildYH + marginChildrenVer
                            ]
                        }
                        data.hrs.push(hr)
                        maxChildYH = hr.pos[1] + hrH
                    }

                    var aUi = setUi(alt)
                    aUi.pos = [
                        pad.l,
                        maxChildYH + marginChildrenVer
                    ]
                    maxChildYH = aUi.pos[1] + aUi.dim[1]
                    maxChildW = Math.max(maxChildW, aUi.pos[0] + aUi.dim[0])
                })
                data.hrs.forEach(function(hr) {
                    hr.dim = [
                        maxChildW - pad.l,
                        hrH
                    ]
                })

                return data.ui = {
                    dim: [
                        maxChildW + pad.r,
                        maxChildYH + pad.b
                    ]
                }
            }
        }// end of var map
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
