const express = require('express')

const router = express.Router()
const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CreditPackage')
const creditPackage = require('../controllers/creditPackage')
const auth = require('../middlewares/auth')({
  secret: config.get('secret').jwtSecret,
  userRepository: dataSource.getRepository('User'),
  logger
})

router.get('/', creditPackage.getAll)

router.post('/', creditPackage.post)

router.post('/:creditPackageId', auth, creditPackage.postUserBuy)

router.delete('/:creditPackageId', creditPackage.deletePackage)

module.exports = router
