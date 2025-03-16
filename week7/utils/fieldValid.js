const validate = require('uuid-validate')

function isUndefined (value) {
    return value === undefined
}
  
function isNotValidString (value) {
    return typeof value !== 'string' || value.trim().length === 0 || value === ''
}
  
function isNotValidInteger (value) {
    return typeof value !== 'number' || value < 0 || value % 1 !== 0
}

function isNotValidUuid(value) {
    return validate(value) !== true
}


module.exports = {
    isUndefined,
    isNotValidString,
    isNotValidInteger,
    isNotValidUuid,
}