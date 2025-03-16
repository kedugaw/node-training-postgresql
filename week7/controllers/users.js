const bcrypt = require('bcrypt')
const { IsNull, In } = require('typeorm')

const config = require('../config/index')
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('UsersController')
const generateJWT = require('../utils/generateJWT')

const passwordPattern = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}/

const { isUndefined, isNotValidInteger, isNotValidString, isNotValidUuid } = require("../utils/fieldValid")
const appError = require("../utils/appError")


async function postSignup (req, res, next) {
  try {
    const { name, email, password } = req.body
    if (isUndefined(name) || isNotValidString(name) || 
      isUndefined(email) || isNotValidString(email) || 
      isUndefined(password) || isNotValidString(password)) {
      logger.warn('欄位未填寫正確')
      return next(appError(400, "欄位未填寫正確"))
    }
    if (!passwordPattern.test(password)) {
      logger.warn('建立使用者錯誤: 密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
      return next(appError(400, "密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字"))
    }
    const userRepo = dataSource.getRepository('User')
    const existingUser = await userRepo.findOne({
      where: { email }
    })

    if (existingUser) {
      logger.warn('建立使用者錯誤: Email 已被使用')
      return next(appError(409, "Email 已被使用"))
    }
    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(password, salt)
    const newUser = userRepo.create({
      name,
      email,
      role: 'USER',
      password: hashPassword
    })
    const savedUser = await userRepo.save(newUser)
    logger.info('新建立的使用者ID:', savedUser.id)
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
}

async function postLogin (req, res, next) {
  try {
    const { email, password } = req.body
    if (isUndefined(email) || isNotValidString(email) || isUndefined(password) || isNotValidString(password)) {
      logger.warn('欄位未填寫正確')
      return next(appError(400, "欄位未填寫正確"))
    }
    if (!passwordPattern.test(password)) {
      logger.warn('密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
      return next(appError(400, "密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字"))
    }
    const userRepository = dataSource.getRepository('User')
    const existingUser = await userRepository.findOne({
      select: ['id', 'name', 'password', 'role'],
      where: { email }
    })

    if (!existingUser) {
      return next(appError(400, "使用者不存在或密碼輸入錯誤"))
    }
    logger.info(`使用者資料: ${JSON.stringify(existingUser)}`)
    const isMatch = await bcrypt.compare(password, existingUser.password)
    if (!isMatch) {
      return next(appError(400, "使用者不存在或密碼輸入錯誤"))
    }
    const token = await generateJWT({
      id: existingUser.id,
      role: existingUser.role
    }, config.get('secret.jwtSecret'), {
      expiresIn: `${config.get('secret.jwtExpiresDay')}`
    })

    res.status(201).json({
      status: 'success',
      data: {
        token,
        user: {
          name: existingUser.name
        }
      }
    })
  } catch (error) {
    logger.error('登入錯誤:', error)
    next(error)
  }
}

async function getProfile (req, res, next) {
  try {
    const { id } = req.user
    const userRepo = dataSource.getRepository('User')
    const user = await userRepo.findOne({
      select: ['name', 'email'],
      where: { id }
    })
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    })
  } catch (error) {
    logger.error('取得使用者資料錯誤:', error)
    next(error)
  }
}

async function getCreditPackage (req, res, next) {
  try {
    const { id } = req.user
    const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
    const creditPurchase = await creditPurchaseRepo.find({
      select: {
        purchased_credits: true,
        price_paid: true,
        purchaseAt: true,
        CreditPackage: {
          name: true
        }
      },
      where: {
        user_id: id
      },
      relations: {
        CreditPackage: true
      }
    })
    res.status(200).json({
      status: 'success',
      data: creditPurchase.map((item) => {
        return {
          name: item.CreditPackage.name,
          purchased_credits: item.purchased_credits,
          price_paid: parseInt(item.price_paid, 10),
          purchase_at: item.purchaseAt
        }
      })
    })
  } catch (error) {
    logger.error('取得使用者資料錯誤:', error)
    next(error)
  }
}

async function putProfile (req, res, next) {
  try {
    const { id } = req.user
    const { name } = req.body
    if (isUndefined(name) || isNotValidString(name)) {
      logger.warn('欄位未填寫正確')
      return next(appError(400, "欄位未填寫正確"))
    }
    const userRepository = dataSource.getRepository('User')
    const user = await userRepository.findOne({
      select: ['name'],
      where: {
        id
      }
    })
    if (user.name === name) {
      return next(appError(400, "使用者名稱未變更"))
    }
    const updatedResult = await userRepository.update({
      id,
      name: user.name
    }, {
      name
    })
    if (updatedResult.affected === 0) {
      return next(appError(400, "更新使用者資料失敗"))
    }
    const result = await userRepository.findOne({
      select: ['name'],
      where: {
        id
      }
    })
    res.status(200).json({
      status: 'success',
      data: {
        user: result
      }
    })
  } catch (error) {
    logger.error('取得使用者資料錯誤:', error)
    next(error)
  }
}

async function putPassword (req, res, next) {
  try {
    const { id } = req.user
    const { password, new_password: newPassword, confirm_new_password: confirmNewPassword } = req.body
    if (isUndefined(password) || isNotValidString(password) ||
      isUndefined(newPassword) || isNotValidString(newPassword) ||
      isUndefined(confirmNewPassword) || isNotValidString(confirmNewPassword)) {
      logger.warn('欄位未填寫正確')
      return next(appError(400, "欄位未填寫正確"))
    }
    if (!passwordPattern.test(password) || !passwordPattern.test(newPassword) || !passwordPattern.test(confirmNewPassword)) {
      logger.warn('密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字')
      return next(appError(400, "密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字"))
    }
    if (newPassword === password) {
      logger.warn('新密碼不能與舊密碼相同')
      return next(appError(400, "新密碼不能與舊密碼相同"))
    }
    if (newPassword !== confirmNewPassword) {
      logger.warn('新密碼與驗證新密碼不一致')
      return next(appError(400, "新密碼與驗證新密碼不一致"))
    }
    const userRepository = dataSource.getRepository('User')
    const existingUser = await userRepository.findOne({
      select: ['password'],
      where: { id }
    })
    const isMatch = await bcrypt.compare(password, existingUser.password)
    if (!isMatch) {
      res.status(400).json({
        status: 'failed',
        message: '密碼輸入錯誤'
      })
      return next(appError(400, "密碼輸入錯誤"))
    }
    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(newPassword, salt)
    const updatedResult = await userRepository.update({
      id
    }, {
      password: hashPassword
    })
    if (updatedResult.affected === 0) {
      res.status(400).json({
        status: 'failed',
        message: '更新密碼失敗'
      })
      return next(appError(400, "更新密碼失敗"))
    }
    res.status(200).json({
      status: 'success',
      data: null
    })
  } catch (error) {
    logger.error('更新密碼錯誤:', error)
    next(error)
  }
}

async function getCourseBooking (req, res, next) {
  try {
    const { id } = req.user
    const creditPurchaseRepo = dataSource.getRepository('CreditPurchase')
    const courseBookingRepo = dataSource.getRepository('CourseBooking')
    const userCredit = await creditPurchaseRepo.sum('purchased_credits', {
      user_id: id
    })
    const userUsedCredit = await courseBookingRepo.count({
      where: {
        user_id: id,
        cancelledAt: IsNull()
      }
    })
    const courseBookingList = await courseBookingRepo.find({
      select: {
        course_id: true,
        Course: {
          name: true,
          start_at: true,
          end_at: true,
          meeting_url: true,
          user_id: true
        }
      },
      where: {
        user_id: id
      },
      order: {
        Course: {
          start_at: 'ASC'
        }
      },
      relations: {
        Course: true
      }
    })
    const coachUserIdMap = {}
    if (courseBookingList.length > 0) {
      courseBookingList.forEach((courseBooking) => {
        coachUserIdMap[courseBooking.Course.user_id] = courseBooking.Course.user_id
      })
      const userRepo = dataSource.getRepository('User')
      const coachUsers = await userRepo.find({
        select: ['id', 'name'],
        where: {
          id: In(Object.values(coachUserIdMap))
        }
      })
      coachUsers.forEach((user) => {
        coachUserIdMap[user.id] = user.name
      })
      logger.debug(`courseBookingList: ${JSON.stringify(courseBookingList)}`)
      logger.debug(`coachUsers: ${JSON.stringify(coachUsers)}`)
    }
    res.status(200).json({
      status: 'success',
      data: {
        credit_remain: userCredit - userUsedCredit,
        credit_usage: userUsedCredit,
        course_booking: courseBookingList.map((courseBooking) => {
          return {
            course_id: courseBooking.course_id,
            name: courseBooking.Course.name,
            start_at: courseBooking.Course.start_at,
            end_at: courseBooking.Course.end_at,
            meeting_url: courseBooking.Course.meeting_url,
            coach_name: coachUserIdMap[courseBooking.Course.user_id]
          }
        })
      }
    })
  } catch (error) {
    logger.error('取得使用者課程錯誤:', error)
    next(error)
  }
}

module.exports = {
  postSignup,
  postLogin,
  getProfile,
  getCreditPackage,
  putProfile,
  putPassword,
  getCourseBooking
}
