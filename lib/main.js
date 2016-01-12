'use strict'

var fs = require('fs')
var KEY_VALUE_REGEX = /^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/
var EXPORT_COMPATIBLE_KEY_VALUE_REGEX = /^\s*(?:export\s*)?([\w\.\-]+)\s*=\s*(.*)?\s*$/

module.exports = {
  /*
   * Main entry point into dotenv. Allows configuration before loading .env
   * @param {Object} options - valid options: path ('.env'), encoding ('utf8')
   * @returns {Boolean}
  */
  config: function (options) {
    var path = '.env'
    var encoding = 'utf8'
    var silent = false
    var exportCompatible = false

    if (options) {
      if (options.silent) {
        silent = options.silent
      }
      if (options.path) {
        path = options.path
      }
      if (options.encoding) {
        encoding = options.encoding
      }
      if (options.exportCompatible) {
        exportCompatible = options.exportCompatible
      }
    }

    try {
      // specifying an encoding returns a string instead of a buffer
      var parsedObj = this.parse(fs.readFileSync(path, { encoding: encoding }), { exportCompatible: exportCompatible })

      Object.keys(parsedObj).forEach(function (key) {
        process.env[key] = process.env[key] || parsedObj[key]
      })

      return true
    } catch (e) {
      if (!silent) {
        console.error(e)
      }
      return false
    }
  },

  /*
   * Parses a string or buffer into an object
   * @param {String|Buffer} src - source to be parsed
   * @returns {Object}
  */
  parse: function (src, options) {
    var obj = {}
    var lineRegex = options && options.exportCompatible ? EXPORT_COMPATIBLE_KEY_VALUE_REGEX : KEY_VALUE_REGEX

    // convert Buffers before splitting into lines and processing
    src.toString().split('\n').forEach(function (line) {
      // matching "KEY' and 'VAL' in 'KEY=VAL' or in 'export KEY=VAL'
      var keyValueArr = line.match(lineRegex)
      // matched?
      if (keyValueArr != null) {
        var key = keyValueArr[1]

        // default undefined or missing values to empty string
        var value = keyValueArr[2] ? keyValueArr[2] : ''

        // expand newlines in quoted values
        var len = value ? value.length : 0
        if (len > 0 && value.charAt(0) === '\"' && value.charAt(len - 1) === '\"') {
          value = value.replace(/\\n/gm, '\n')
        }

        // remove any surrounding quotes and extra spaces
        value = value.replace(/(^['"]|['"]$)/g, '').trim()

        // is this value a variable?
        if (value.charAt(0) === '$') {
          var possibleVar = value.substring(1)
          value = obj[possibleVar] || process.env[possibleVar] || ''
        }
        // varaible can be escaped with a \$
        if (value.substring(0, 2) === '\\$') {
          value = value.substring(1)
        }

        obj[key] = value
      }
    })

    return obj
  }

}

module.exports.load = module.exports.config
