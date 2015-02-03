var _ = require('lodash')
var parser = require('../parser')
var getExpectations = require('./getExpectations')

function stringify(o){
    return JSON.stringify(o, null, 4)
}

var strToExpected = getExpectations()
_.each(strToExpected, function(expected, str){
    var actual = parser.parse(str)
    var success = _.isEqual(actual, expected, function(act, exp){
        delete act.hint // not comparing hints
    })
    if (success) {
        console.info(str, success)
    } else {
        console.error(str, success, stringify(actual), stringify(expected))
    }
})

