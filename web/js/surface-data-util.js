;(function(surfaceData) {
    'use strict'

    surfaceData.markerLen = 7
    surfaceData.neighborArrowColor = '#8a8a8a'
    surfaceData.fillForNegative = '#ccc'

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

    // surfaceData.adjustForMarkerEnd = function(pt, isVertical) {
    //     pt[isVertical ? 1 : 0] -= surfaceData.markerLen
    //     return pt
    // }
    surfaceData.reflectedQuadra = function(from, to, isVertical) {
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
    /*
        If this cubic line ends with a marker, makes adjustment to
            the `to` point by backtracking to the left by a smidge
            more than the marker length.
        In this case, however, the caller is still responsible for
            adding the unadjusted `to` point as the last element in
            the `d` array. For why, see 'path' class in classes-svg.js.

        Not supporting vertical marker end, b/c the app doesn't use
            a cubic line that ends vertically.
    */
    surfaceData.cubic = function(ctrl, to, endsWithMarkerEnd) {
        var segms = ['C', ctrl, ctrl]
        if (endsWithMarkerEnd) {
            segms.push([
                to[0] - surfaceData.markerLen - .01,
                to[1]
            ])
        } else {
            segms.push(to)
        }
        return segms.join(' ')
    }

})(window.surfaceData = window.surfaceData || {})
