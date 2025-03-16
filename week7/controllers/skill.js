const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('SkillController')
const { isUndefined, isNotValidString, isNotValidUuid } = require("../utils/fieldValid")
const appError = require("../utils/appError")


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
    if (isUndefined(name) || isNotValidString(name)) {
      return next(appError(400, "欄位未填寫正確"))
    }
    const skillRepo = dataSource.getRepository('Skill')
    const existSkill = await skillRepo.findOne({
      where: {
        name
      }
    })
    if (existSkill) {
      return next(appError(400, "資料重複"))
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
    if (isNotValidUuid(skillId) || isUndefined(skillId) || isNotValidString(skillId)) {
      return next(appError(400, "ID錯誤"))
    }
    const result = await dataSource.getRepository('Skill').delete(skillId)
    if (result.affected === 0) {
      return next(appError(400, "ID錯誤"))
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
