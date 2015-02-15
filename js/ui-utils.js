;(function(surfaceData) {
    'use strict'
    
    surfaceData.utils = {
        reflectedQuadra: function(from, to, isVertical) {
            var vector = [
                to[0] - from[0],
                to[1] - from[1]
            ]
            var quadraCtrlPt
            if (isVertical) {
                quadraCtrlPt = [
                    from[0],
                    from[1] + vector[1] / 4
                ]
            } else {
                quadraCtrlPt = [
                    from[0] + vector[0] / 4,
                    from[1]
                ]
            }
            var midPt = [
                from[0] + vector[0] / 2,
                from[1] + vector[1] / 2
            ]
            return ['Q', quadraCtrlPt, midPt, 'T', to].join(' ')
        }
    }
})(window.surfaceData = window.surfaceData || {})
