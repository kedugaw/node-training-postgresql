const express = require('express')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CreditPackage')
const auth = require('../middlewares/auth')({
    secret: config.get('secret').jwtSecret,
    userRepository: dataSource.getRepository('User'),
    logger
})
const { isUndefined, isNotValidString, isNotValidInteger, isNotValidUuid } = require("../utils/fieldValid");

router.get('/', async (req, res, next) => {
    try {
        // 查詢所有組合包方案
        const creditPackage = await dataSource.getRepository('CreditPackage').find({
          select: ['id', 'name', 'credit_amount', 'price']
        })
        // 回傳 200 與資料
        res.status(200).json({
          status: 'success',
          data: creditPackage
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.post('/', async (req, res, next) => {
    try {
        // 接收請求參數
        const { name, credit_amount, price } = req.body
        // 驗證必填欄位
        if (isUndefined(name) || isNotValidString(name) ||
            isUndefined(credit_amount) || isNotValidInteger(credit_amount) ||
            isUndefined(price) || isNotValidInteger(price)) {
            // 回傳 400 錯誤
            res.status(400).json({
                status: 'failed',
                message: '欄位未填寫正確'
            })
            return
        }
        const creditPackageRepo = await dataSource.getRepository('CreditPackage')
        // 查詢組合包方案名稱是否存在
        const existCreditPackage = await creditPackageRepo.find({
            where: {
                name
            }
        })
        // 回傳 409 錯誤
        if (existCreditPackage.length > 0) {
            res.status(409).json({
              status: 'failed',
              message: '資料重複'
            })
            return
        }
        // 建立新的組合包方案
        const newCreditPackage = await creditPackageRepo.create({
            name,
            credit_amount,
            price
        })
        // 儲存資料
        const result = await creditPackageRepo.save(newCreditPackage)
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

// 使用者購買方案 {url}/api/credit-package/:creditPackageId
router.post('/:creditPackageId', auth, async (req, res, next) => {
    try {
        const { id } = req.user
        const { creditPackageId } = req.params
        const creditPackageRepo = dataSource.getRepository('CreditPackage')
        const creditPackage = await creditPackageRepo.findOne({
            where: {
                id: creditPackageId
            }
        })
        if (!creditPackage) {
            res.status(400).json({
                status: 'failed',
                message: 'ID錯誤'
            })
            return
        }
        const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
        const newPurchase = await creditPurchaseRepo.create({
            user_id: id,
            credit_package_id: creditPackageId,
            purchased_credits: creditPackage.credit_amount,
            price_paid: creditPackage.price,
            purchaseAt: new Date().toISOString()
        })
        await creditPurchaseRepo.save(newPurchase)
        res.status(200).json({
            status: 'success',
            data: null
        })
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

router.delete('/:creditPackageId', async (req, res, next) => {
    try {
        // 接收組合包 ID參數
        const { creditPackageId } = req.params
        // 驗證 ID格式 (不為空值,須為字串,須為uuid格式)
        if (isUndefined(creditPackageId) || isNotValidString(creditPackageId) ||
            isNotValidUuid(creditPackageId)) {
            res.status(400).json({
                status: 'failed',
                message: '欄位未填寫正確'
            })
            return
        }
        // 刪除指定ID的組合包方案
        const result = await dataSource.getRepository('CreditPackage').delete(creditPackageId)
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
    } catch (error) {
        logger.error(error)
        next(error)
    }
})

module.exports = router
