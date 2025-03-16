const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('SkillController')

function isUndefined (value) {
  return value === undefined
}

function isNotValidSting (value) {
  return typeof value !== 'string' || value.trim().length === 0 || value === ''
}

async function getAll (req, res, next) {
  try {
    const skills = await dataSource.getRepository('Skill').find({
      select: ['id', 'name']
    })
    res.status(200).json({
      status: 'success',
      data: skills
    })
  } catch (error) {
    logger.error(error)
    next(error)
  }
}

async function post (req, res, next) {
  try {
    const { name } = req.body
    if (isUndefined(name) || isNotValidSting(name)) {
      res.status(400).json({
        status: 'failed',
        message: '欄位未填寫正確'
      })
      return
    }
    const skillRepo = dataSource.getRepository('Skill')
    const existSkill = await skillRepo.findOne({
      where: {
        name
      }
    })
    if (existSkill) {
      res.status(409).json({
        status: 'failed',
        message: '資料重複'
      })
      return
    }
    const newSkill = await skillRepo.create({
      name
    })
    const result = await skillRepo.save(newSkill)
    res.status(200).json({
      status: 'success',
      data: result
    })
  } catch (error) {
    logger.error(error)
    next(error)
  }
}

async function deletePackage (req, res, next) {
  try {
    const { skillId } = req.params
    if (isUndefined(skillId) || isNotValidSting(skillId)) {
      res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
      return
    }
    const result = await dataSource.getRepository('Skill').delete(skillId)
    if (result.affected === 0) {
      res.status(400).json({
        status: 'failed',
        message: 'ID錯誤'
      })
      return
    }
    res.status(200).json({
      status: 'success'
    })
  } catch (error) {
    logger.error(error)
    next(error)
  }
}

module.exports = {
  getAll,
  post,
  deletePackage
}
