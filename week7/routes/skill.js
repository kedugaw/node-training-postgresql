const express = require('express')

const router = express.Router()
const skill = require('../controllers/skill')

router.get('/', skill.getAll)

router.post('/', skill.post)

router.delete('/:skillId', skill.deletePackage)

module.exports = router
