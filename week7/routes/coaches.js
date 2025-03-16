const express = require('express')

const router = express.Router()
const coaches = require('../controllers/coaches')

router.get('/', coaches.getCoaches)

router.get('/:coachId', coaches.getCoachDetail)

router.get('/:coachId/courses', coaches.getCoachCourses)

module.exports = router
