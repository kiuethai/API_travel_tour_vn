import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE, EMAIL_RULE, EMAIL_RULE_MESSAGE } from '~/utils/validators'

const createBooking = async (req, res, next) => {
  const correctCondition = Joi.object({
    address: Joi.string().required(),
    email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE),
    fullName: Joi.string().pattern(/^[a-zA-ZÀ-ỹ\s]+$/u).strict().trim().required(),
    numAdults: Joi.number().integer().min(0).required(),
    numChildren: Joi.number().integer().min(0).required(),
    payment_hidden: Joi.string(),
    tel: Joi.string().required().pattern(/^[0-9]{10,15}$/),
    totalPrice: Joi.number().min(0).required(),
    tourId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    transactionIdPaypal: Joi.string().allow(null, ''),
    transactionIdMomo: Joi.string().allow(null, ''),
    userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
  })

  try {
    // Handle string values from form data
    if (typeof req.body.numAdults === 'string') req.body.numAdults = Number(req.body.numAdults)
    if (typeof req.body.numChildren === 'string') req.body.numChildren = Number(req.body.numChildren)
    if (typeof req.body.totalPrice === 'string') req.body.totalPrice = Number(req.body.totalPrice)

    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const bookingValidation = {
  createBooking
}
