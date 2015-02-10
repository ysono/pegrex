window.utils = {
    reflectedQuadra: function(from, to) {
        var vector = [
            to[0] - from[0],
            to[1] - from[1]
        ]
        var quadraCtrlPt = [
            from[0] + vector[0] / 4,
            from[1]
        ]
        var midPt = [
            from[0] + vector[0] / 2,
            from[1] + vector[1] / 2
        ]
        return ['Q', quadraCtrlPt, midPt, 'T', to].join(' ')
    }
}