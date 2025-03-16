const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CreditPackageController')
const { isUndefined, isNotValidInteger, isNotValidString, isNotValidUuid } = require("../utils/fieldValid")
const appError = require("../utils/appError")


async function getAll (req, res, next) {
  try {
    const creditPackages = await dataSource.getRepository('CreditPackage').find({
      select: ['id', 'name', 'credit_amount', 'price']
    })
    res.status(200).json({
      status: 'success',
      data: creditPackages
    })
  } catch (error) {
    logger.error(error)
    next(error)
  }
}

async function post (req, res, next) {
  try {
    const { name, credit_amount: creditAmount, price } = req.body
    if (isUndefined(name) || isNotValidString(name) ||
      isUndefined(creditAmount) || isNotValidInteger(creditAmount) ||
      isUndefined(price) || isNotValidInteger(price)) {
      return next(appError(400, "欄位未填寫正確"))
    }
    const creditPackageRepo = dataSource.getRepository('CreditPackage')
    const existCreditPackage = await creditPackageRepo.findOne({
      where: {
        name
      }
    })
    if (existCreditPackage) {
      return next(appError(409, "資料重複"))
    }
    const newCreditPackage = await creditPackageRepo.create({
      name,
      credit_amount: creditAmount,
      price
    })
    const result = await creditPackageRepo.save(newCreditPackage)
    res.status(200).json({
      status: 'success',
      data: result
    })
  } catch (error) {
    logger.error(error)
    next(error)
  }
}

async function postUserBuy (req, res, next) {
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
      return next(appError(400, "ID錯誤"))
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
}

async function deletePackage (req, res, next) {
  try {
    const { creditPackageId } = req.params
    if (isNotValidUuid(creditPackageId) || isUndefined(creditPackageId) || isNotValidString(creditPackageId)) {
      return next(appError(400, "欄位未填寫正確"))
    }
    const result = await dataSource.getRepository('CreditPackage').delete(creditPackageId)
    if (result.affected === 0) {
      return next(appError(400, "ID錯誤"))
    }
    res.status(200).json({
      status: 'success',
      data: result
    })
  } catch (error) {
    logger.error(error)
    next(error)
  }
}

module.exports = {
  getAll,
  post,
  postUserBuy,
  deletePackage
}
