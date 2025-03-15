const express = require('express')

const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Skill')
const { isUndefined, isNotValidString, isNotValidUuid } = require("../utils/fieldValid");

router.get('/', async (req, res, next) => {
    try {
        // 查詢所有教練專長
        const skill = await dataSource.getRepository('Skill').find({
            select: ['id', 'name']
        })
        // 回傳 200 與資料
        res.status(200).json({
            status: 'success',
            data: skill
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.post('/', async (req, res, next) => {
    try {
        // 接收教練專長名稱
        const { name } = req.body
        // 驗證名稱欄位
        if (isUndefined(name) || isNotValidString(name)) {
            // 回傳 400 錯誤
            res.status(400).json({
                status: 'failed',
                message: '欄位未填寫正確'
            })
            return
        }
        const skillRepo = await dataSource.getRepository('Skill')
        // 查詢教練專長名稱是否存在
        const existSkill = await skillRepo.find({
            where: {
                name
            }
        })
        // 回傳 409 錯誤
        if (existSkill.length > 0) {
            res.status(409).json({
                status: 'failed',
                message: '資料重複'
            })
            return
        }
        // 建立新的教練專長
        const newSkill = await skillRepo.create({
            name
        })
        // 儲存資料
        const result = await skillRepo.save(newSkill)
        // 回傳 201 與新增資料
        res.status(201).json({
            status: 'success',
            data: result
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.delete('/:skillId', async (req, res, next) => {
    try {
        // 從url取得教練專長ID
        const skillId = req.url.split('/').pop()
        // 驗證 ID格式 (不為空值,須為字串,須為uuid格式)
        if (isUndefined(skillId) || isNotValidString(skillId) || isNotValidUuid(skillId)) {
            res.status(400).json({
                status: 'failed',
                message: '欄位未填寫正確'
            })
            return
        }
         // 刪除指定ID的教練專長
        const result = await dataSource.getRepository('Skill').delete(skillId)
        if (result.affected === 0) {
            // 刪除失敗,回傳 400 錯誤
            res.status(400).json({
                status: 'failed',
                message: 'ID錯誤'
            })
            return
        }
        // 刪除成功,回傳 200 與結果
        res.status(200).json({
            status: 'success',
            data: result
        })
        res.end()
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

  module.exports = router