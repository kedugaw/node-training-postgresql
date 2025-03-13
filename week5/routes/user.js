const express = require('express')
const bcrypt = require('bcrypt')

const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Users')
const { isUndefined, isNotValidString, isNotValidUuid } = require("../utils/fieldValid");

const saltRounds = 10

// 新增使用者([POST] 註冊使用者：{url}/api/users/signup)
router.post('/signup', async (req, res, next) => {
    try {
        const passwordPattern = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}/
        // 接收請求參數
        const { name, email, password } = req.body
        // 驗證必填欄位
        if (isUndefined(name) || isNotValidString(name) || 
            isUndefined(email) || isNotValidString(email) || 
            isUndefined(password) || isNotValidString(password)) {
            logger.warn('欄位未填寫正確')
            res.status(400).json({
                status: 'failed',
                message: '欄位未填寫正確'
            })
            return
        }
        if (!passwordPattern.test(password)) {
            logger.warn('建立使用者錯誤: 密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
            res.status(400).json({
              status: 'failed',
              message: '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'
            })
            return
        }
        const userRepo = dataSource.getRepository('User')
        // 檢查 email 是否已存在
        const existingUser = await userRepo.findOne({
            where: { email }
        })
        // 回傳 409 錯誤
        if (existingUser) {
            logger.warn('建立使用者錯誤: Email 已被使用')
            res.status(409).json({
                status: 'failed',
                message: 'Email 已被使用'
            })
            return
        }
        // 建立新使用者
        const hashPassword = await bcrypt.hash(password, saltRounds)
        const newUser = userRepo.create({
            name,
            email,
            role: 'USER',
            password: hashPassword
        })
        // 儲存資料
        const savedUser = await userRepo.save(newUser)
        logger.info('新建立的使用者ID:', savedUser.id)
        // 回傳 201 與新增資料
        res.status(201).json({
            status: 'success',
            data: {
              user: {
                id: savedUser.id,
                name: savedUser.name
              }
            }
        })
    } catch (error) {
        logger.error('建立使用者錯誤:', error)
        next(error)
    }
})

module.exports = router