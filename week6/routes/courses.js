const express = require('express')
const { IsNull } = require('typeorm')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Course')
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
})

// 取得課程列表 {url}/api/courses
router.get('/', async (req, res, next) => {
    try {
        const courseRepo = dataSource.getRepository('Course');
        const courses = await courseRepo
          .createQueryBuilder('course')
          .leftJoinAndSelect('course.user', 'user')
          .leftJoinAndSelect('course.skill', 'skill')
          .select([
            'course.id',
            'course.name',
            'course.description',
            'course.start_at',
            'course.end_at',
            'course.max_participants',
            'user.name',
            'skill.id',
            'skill.name',
          ])
          .orderBy('course.created_at', 'DESC')
          .getMany();

        res.status(200).json({
            status: 'success',
            data: courses.map((course) => {
            return {
                id: course.id,
                name: course.name,
                description: course.description,
                start_at: course.start_at,
                end_at: course.end_at,
                max_participants: course.max_participants,
                coach_name: course.user?.name,
                skill_name: course.skill?.name,
            }
          })
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

// 報名課程 {url}/api/courses/:courseId
router.post('/:courseId', auth, async (req, res, next) => {
    try {
      const { id } = req.user
      const { courseId } = req.params
      const courseRepo = dataSource.getRepository('Course')
      const course = await courseRepo.findOne({
        where: {
          id: courseId
        }
      })
      if (!course) {
        res.status(400).json({
          status: 'failed',
          message: 'ID錯誤'
        })
        return
      }
      const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
      const courseBookingRepo = dataSource.getRepository('CourseBooking')
      const userCourseBooking = await courseBookingRepo.findOne({
        where: {
          user_id: id,
          course_id: courseId
        }
      })
      if (userCourseBooking) {
        res.status(400).json({
          status: 'failed',
          message: '已經報名過此課程'
        })
        return
      }
      const userCredit = await creditPurchaseRepo.sum('purchased_credits', {
        user_id: id
      })
      const userUsedCredit = await courseBookingRepo.count({
        where: {
          user_id: id,
          cancelledAt: IsNull()
        }
      })
      const courseBookingCount = await courseBookingRepo.count({
        where: {
          course_id: courseId,
          cancelledAt: IsNull()
        }
      })
      if (userUsedCredit >= userCredit) {
        res.status(400).json({
          status: 'failed',
          message: '已無可使用堂數'
        })
        return
      } else if (courseBookingCount >= course.max_participants) {
        res.status(400).json({
          status: 'failed',
          message: '已達最大參加人數，無法參加'
        })
        return
      }
      const newCourseBooking = await courseBookingRepo.create({
        user_id: id,
        course_id: courseId
      })
      await courseBookingRepo.save(newCourseBooking)
      res.status(201).json({
        status: 'success',
        data: null
      })
    } catch (error) {
      logger.error(error)
      next(error)
    }
})

// 取消課程 {url}/api/courses/:courseId
router.delete('/:courseId', auth, async (req, res, next) => {
    try {
      const { id } = req.user
      const { courseId } = req.params
      const courseBookingRepo = dataSource.getRepository('CourseBooking')
      const userCourseBooking = await courseBookingRepo.findOne({
        where: {
          user_id: id,
          course_id: courseId,
          cancelledAt: IsNull()
        }
      })
      if (!userCourseBooking) {
        res.status(400).json({
          status: 'failed',
          message: 'ID錯誤'
        })
        return
      }
      const updateResult = await courseBookingRepo.update(
        {
          user_id: id,
          course_id: courseId,
          cancelledAt: IsNull()
        },
        {
          cancelledAt: new Date().toISOString()
        }
      )
      if (updateResult.affected === 0) {
        res.status(400).json({
          status: 'failed',
          message: '取消失敗'
        })
        return
      }
      res.status(200).json({
        status: 'success',
        data: null
      })
    } catch (error) {
      logger.error(error)
      next(error)
    }
})  

module.exports = router