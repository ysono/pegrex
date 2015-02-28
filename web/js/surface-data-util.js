;(function(surfaceData) {
    'use strict'

    surfaceData.markerLen = 7
    surfaceData.neighborArrowColor = '#8a8a8a'
    surfaceData.fillForNegative = '#ccc'
    surfaceData.selectableArrowHeight = surfaceData.markerLen * 3
        // tall enough as a click target for add/replace action;
        // not so tall as to block elements underneath, which can
        // easily be done in nested disjunctions b/c these disjs
        // use quadratic curves for their neighborArrows

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
    surfaceData.getChildTokens = function(token) {
        var prop = typeToChildProp[token.type]
        if (typeof prop === 'string') {
            return token[prop]
        }
        if (prop instanceof Array) {
            return prop.reduce(function(vals, prop) {
                return vals.concat(token[prop] || [])
            }, [])
        }
        // else return undefined
    }

    surfaceData.reflectedQuadra = function(from, to, isVertical) {
        var vector = [
            to[0] - from[0],
            to[1] - from[1]
        ]
        var ctrlPt = isVertical
            ? [
                from[0],
                from[1] + vector[1] / 4
            ]
            : [
                from[0] + vector[0] / 4,
                from[1]
            ]
        var midPt = [
            from[0] + vector[0] / 2,
            from[1] + vector[1] / 2
        ]
        return ['Q', ctrlPt, midPt, 'T', to].join(' ')
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
    surfaceData.cubic = function(ctrl, to, endsWithMarker) {
        var segms = ['C', ctrl, ctrl]
        if (endsWithMarker) {
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
