/*
This test is tabled.

It could be beneficial if the results were printed onto an html, with diff tool.

But the test data would be too large, and the code is already too complicated for testing.
*/

var _ = require('lodash')
var parser = require('../../parser')
var getExpectations = require('./getExpectations')

function stringify(o){
    return JSON.stringify(o, null, 4)
}

var strToExpected = getExpectations()
_.each(strToExpected, function(expected, str){
    var actual = parser.parse(str)
    var success = _.isEqual(actual, expected, function(act, exp){
        delete act.hint // not comparing hints
        delete act.location // lazy - not comparing locations
    })
    if (success) {
        console.info(success, str)
    } else {
        // node's console needs String(boolean) for the first arg, or \n in json doesn't work?
        console.error(String(success), str, stringify(actual), stringify(expected))
    }
})

console.info('done experimental testing on parser')
