import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

// Define Collection (name & schema)
const CHECKOUT_COLLECTION_NAME = 'checkouts'
const CHECKOUT_COLLECTION_SCHEMA = Joi.object({
  bookingId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  paymentMethod: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  paymentStatus: Joi.string().valid('y', 'n').default('n'),
  transactionId: Joi.string().allow(null, ''),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Fields that cannot be updated
const INVALID_UPDATE_FIELDS = ['_id', 'bookingId', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await CHECKOUT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdCheckout = await GET_DB().collection(CHECKOUT_COLLECTION_NAME).insertOne(validData)
    const getNewCheckout = await findOneById(createdCheckout.insertedId)
    return getNewCheckout
  } catch (error) { throw new Error(error) }
}

const findOneById = async (checkoutId) => {
  try {
    const result = await GET_DB().collection(CHECKOUT_COLLECTION_NAME).findOne({ _id: new ObjectId(checkoutId) })
    return result
  } catch (error) { throw new Error(error) }
}

const update = async (checkoutId, updateData) => {
  try {
    // Filter fields that can't be updated
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    updateData.updatedAt = Date.now()

    const result = await GET_DB().collection(CHECKOUT_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(checkoutId) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) { throw new Error(error) }
}

export const checkoutModel = {
  CHECKOUT_COLLECTION_NAME,
  CHECKOUT_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  update
}
