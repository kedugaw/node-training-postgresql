const express = require('express')

const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('Coach')
const { isUndefined, isNotValidString, isNotValidInteger, isNotValidUuid } = require("../utils/fieldValid");

// 取得教練列表 {url}/api/coaches/?per=?page=?
router.get('/', async (req, res, next) => {
    try {
        // 接收請求參數 每頁筆數,目前分頁
        const { per, page } = req.query;
        // 驗證
        if (isUndefined(per) || isNotValidString(per) ||
            isUndefined(page) || isNotValidString(page)) {
            res.status(400).json({
                status: "failed",
                message: "欄位未填寫正確",
            })
            return
        }
        // 每頁筆數,目前分頁 轉成數字
        const perNumber = parseInt(req.query.per || 10); // 預設每頁10筆
        const pageNumber = parseInt(req.query.page || 1); // 預設第1頁
        // 取得教練列表
        const [coaches] = await dataSource.getRepository("Coach").findAndCount({
            take: perNumber, // 每頁顯示的教練數量
            skip: (pageNumber - 1) * perNumber, // 跳過的教練數量
            relations: {
                User: true,
            },
        })
        const coachList = coaches.map((coach) => ({
            id: coach.id,
            name: coach.User?.name,
        }))
        // 回傳 200 與教練資料
        res.status(200).json({
            status: "success",
            data: coachList,
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

// 取得教練詳細資訊 {url}/api/coaches/:coachId
router.get('/:coachId', async (req, res, next) => {
    try {
        // 接收教練ID參數
        const { coachId } = req.params;
        // 驗證 ID格式 (不為空值,須為字串,須為uuid格式)
        if (isUndefined(coachId) || isNotValidString(coachId) ||
            isNotValidUuid(coachId)) {
            res.status(400).json({
                status: "failed",
                message: "欄位未填寫正確",
            })
            return
        }
        
        const coachRepo = dataSource.getRepository("Coach");
        // 查詢教練ID是否存在
        const findCoach = await coachRepo.findOne({
            where: {
                id: coachId,
            },
            relations: {
                User: true,
            },
        })
        if (!findCoach) {
            // 回傳 400 錯誤
            res.status(400).json({
                status: "failed",
                message: "找不到該教練",
            })
            return
        } else {
            coachDetail = {
                user: {
                  name: findCoach.User?.name,
                  role: findCoach.User?.role,
                },
                coach: {
                  id: findCoach.id,
                  user_id: findCoach.user_id,
                  experience_years: findCoach.experience_years,
                  description: findCoach.description,
                  profile_image_url: findCoach.profile_image_url,
                  created_at: findCoach.created_at,
                  updated_at: findCoach.updated_at,
                },
            }
            // 回傳 200 與教練詳細資料
            res.status(200).json({
                status: "success",
                data: coachDetail,
            })
        }
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

module.exports = router