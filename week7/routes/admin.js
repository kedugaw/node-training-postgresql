const express = require('express')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Admin')
const admin = require('../controllers/admin')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})
const isCoach = require('../middlewares/isCoach')

router.post('/coaches/courses', auth, isCoach, admin.postCourse)

router.get('/coaches/revenue', auth, isCoach, admin.getCoachRevenue)

router.get('/coaches/courses', auth, isCoach, admin.getCoachCourses)

router.get('/coaches/courses/:courseId', auth, admin.getCoachCourseDetail)

router.put('/coaches/courses/:courseId', auth, admin.putCoachCourseDetail)

router.post('/coaches/:userId', admin.postCoach)

router.put('/coaches', auth, isCoach, admin.putCoachProfile)

router.get('/coaches', auth, isCoach, admin.getCoachProfile)

module.exports = router
