;(function(reactClasses) {
    'use strict'

    reactClasses.hashUtil = {
        read: function() {
            // ff decodes location.hash
            return decodeURIComponent(window.location.href.split("#")[1])
        },
        parse: function() {
            var hash = reactClasses.hashUtil.read()
            var commaIndex = hash.indexOf(',')
            if (commaIndex <= 0) { return }
            var patternLen = Number(hash.slice(0, commaIndex))
            if (isNaN(patternLen)) { return }
            var flagsIndex = commaIndex + 1 + patternLen
            return {
                pattern: hash.slice(commaIndex + 1, flagsIndex),
                flags: hash.slice(flagsIndex)
            }
        },
        update: function(parts, rememberPrev) {
            var hash = parts.pattern.length + ','
                + parts.pattern + parts.flags
            if (hash === reactClasses.hashUtil.read()) {
                return
            }
            if (rememberPrev) {
                window.location.hash = encodeURIComponent(hash)
            } else {
                window.location.replace('#' + encodeURIComponent(hash))
            }
        }
    }

    reactClasses.ls = {
        readBool: function(key, def) {
            var val = localStorage.getItem(key)
            return val
                ? val !== 'false'
                : def
        }
    }

})(window.reactClasses = window.reactClasses || {})
