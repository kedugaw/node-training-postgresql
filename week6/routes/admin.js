const express = require('express')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Admin')
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
})
const isCoach = require('../middlewares/isCoach')
const { isUndefined, isNotValidString, isNotValidInteger, isNotValidUuid } = require("../utils/fieldValid");

// 新增教練課程資料 {url}/api/admin/coaches/courses
router.post('/coaches/courses', auth, isCoach, async (req, res, next) => {
    try {
        const { id } = req.user
        // 接收請求參數
        const {
            skill_id: skillId, name, description, start_at: startAt, end_at: endAt,
            max_participants: maxParticipants, meeting_url: meetingUrl
        } = req.body
        // 驗證必填欄位
        if (isUndefined(skillId) || isNotValidString(skillId) ||
            isUndefined(name) || isNotValidString(name) ||
            isUndefined(description) || isNotValidString(description) ||
            isUndefined(startAt) || isNotValidString(startAt) ||
            isUndefined(endAt) || isNotValidString(endAt) ||
            isUndefined(maxParticipants) || isNotValidInteger(maxParticipants) ||
            isUndefined(meetingUrl) || isNotValidString(meetingUrl) || !meetingUrl.startsWith('https')) {
            logger.warn('欄位未填寫正確')
            res.status(400).json({
                status: 'failed',
                message: '欄位未填寫正確'
            })
            return
        }
        
        const courseRepo = dataSource.getRepository('Course')
        // 建立新的課程資料
        const newCourse = courseRepo.create({
            user_id: id,
            skill_id: skillId,
            name,
            description,
            start_at: startAt,
            end_at: endAt,
            max_participants: maxParticipants,
            meeting_url: meetingUrl
        })
        // 儲存課程資料
        const savedCourse = await courseRepo.save(newCourse)
        const course = await courseRepo.findOne({
            where: { id: savedCourse.id }
        })
        // 回傳 201 與新增資料
        res.status(201).json({
            status: 'success',
            data: {
                course
            }
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

// 編輯教練課程資料 {url}/api/admin/coaches/courses/:courseId
router.put('/coaches/courses/:courseId', auth, isCoach, async (req, res, next) => {
    try {
        const { id } = req.user
        // 接收課程 ID參數
        const { courseId } = req.params
        // 接收請求參數
        const {
            skill_id: skillId, name, description, start_at: startAt, end_at: endAt,
            max_participants: maxParticipants, meeting_url: meetingUrl
        } = req.body
        // 驗證必填欄位
        if (isNotValidUuid(courseId)) {
            logger.warn('欄位未填寫正確-uuid')
            res.status(400).json({
                status: 'failed',
                message: '欄位未填寫正確'
            })
            return
        }
        if (isNotValidString(courseId) ||
            isUndefined(skillId) || isNotValidString(skillId) ||
            isUndefined(name) || isNotValidString(name) ||
            isUndefined(description) || isNotValidString(description) ||
            isUndefined(startAt) || isNotValidString(startAt) ||
            isUndefined(endAt) || isNotValidString(endAt) ||
            isUndefined(maxParticipants) || isNotValidInteger(maxParticipants) ||
            isUndefined(meetingUrl) || isNotValidString(meetingUrl) || !meetingUrl.startsWith('https')) {
            logger.warn('欄位未填寫正確')
            res.status(400).json({
                status: 'failed',
                message: '欄位未填寫正確'
            })
            return
        }
        
        const courseRepo = dataSource.getRepository('Course')
        // 查詢課程ID是否存在
        const existingCourse = await courseRepo.findOne({
            where: { id: courseId, user_id: id }
        })
        if (!existingCourse) {
            logger.warn('課程不存在')
            res.status(400).json({
                status: 'failed',
                message: '課程不存在'
            })
            return
        }
        // 更新課程資料
        const updateCourse = await courseRepo.update({
            id: courseId
            }, {
                skill_id: skillId,
                name,
                description,
                start_at: startAt,
                end_at: endAt,
                max_participants: maxParticipants,
                meeting_url: meetingUrl
        })
        if (updateCourse.affected === 0) {
            logger.warn('更新課程失敗')
            res.status(400).json({
                status: 'failed',
                message: '更新課程失敗'
            })
            return
        }
        // 回傳 200 與更新資料
        const savedCourse = await courseRepo.findOne({
            where: { id: courseId }
        })
        res.status(200).json({
            status: 'success',
            data: {
                course: savedCourse
            }
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

// 將使用者新增為教練 {url}/api/admin/coaches/:userId
router.post('/coaches/:userId', async (req, res, next) => {
    try {
        // 接收使用者 ID參數
        const { userId } = req.params
        // 接收請求參數
        const { experience_years: experienceYears, description, profile_image_url: profileImageUrl = null } = req.body
        // 驗證必填欄位
        if (isNotValidUuid(userId)) {
            logger.warn('欄位未填寫正確-uuid')
            res.status(400).json({
                status: 'failed',
                message: '欄位未填寫正確'
            })
            return
        }
        if (isUndefined(experienceYears) || isNotValidInteger(experienceYears) || 
            isUndefined(description) || isNotValidString(description)) {
            logger.warn('欄位未填寫正確')
            res.status(400).json({
                status: 'failed',
                message: '欄位未填寫正確'
            })
            return
        }
        if (profileImageUrl && !isNotValidString(profileImageUrl) && !profileImageUrl.startsWith('https')) {
            logger.warn('大頭貼網址錯誤')
            res.status(400).json({
                status: 'failed',
                message: '欄位未填寫正確'
            })
            return
        }

        const userRepo = dataSource.getRepository('User')
        // 查詢使用者ID是否存在,是否為教練
        const existingUser = await userRepo.findOne({
            select: ['id', 'name', 'role'],
            where: { id: userId }
        })
        if (!existingUser) {
            // 回傳 400 錯誤
            logger.warn('使用者不存在')
            res.status(400).json({
                status: 'failed',
                message: '使用者不存在'
            })
            return
        } else if (existingUser.role === 'COACH') {
            // 回傳 409 錯誤
            logger.warn('使用者已經是教練')
            res.status(409).json({
                status: 'failed',
                message: '使用者已經是教練'
            })
            return
        }
    
        const coachRepo = dataSource.getRepository('Coach')
        // 建立新的教練資料
        const newCoach = coachRepo.create({
            user_id: userId,
            experience_years: experienceYears,
            description,
            profile_image_url: profileImageUrl
        })
        // 更新使用者角色為教練
        const updatedUser = await userRepo.update({
            id: userId,
            role: 'USER'
            }, {
            role: 'COACH'
        })
        if (updatedUser.affected === 0) {
            logger.warn('更新使用者失敗')
            res.status(400).json({
                status: 'failed',
                message: '更新使用者失敗'
            })
            return
        }
        // 儲存教練資料
        const savedCoach = await coachRepo.save(newCoach)
        const savedUser = await userRepo.findOne({
            select: ['name', 'role'],
            where: { id: userId }
        })
        res.status(201).json({
            status: 'success',
            data: {
                user: savedUser,
                coach: savedCoach
            }
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

module.exports = router