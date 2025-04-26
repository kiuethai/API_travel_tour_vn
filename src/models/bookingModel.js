import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

// Define Collection (name & schema)
const BOOKING_COLLECTION_NAME = 'bookings'
const BOOKING_COLLECTION_SCHEMA = Joi.object({
  tourId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  userId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
  fullName: Joi.string().required(),
  email: Joi.string().required(),
  address: Joi.string().required(),
  phoneNumber: Joi.string().required(),
  numAdults: Joi.number().integer().min(0).required(),
  numChildren: Joi.number().integer().min(0).default(0),
  totalPrice: Joi.number().required(),
  status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').default('pending'),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Fields that cannot be updated
const INVALID_UPDATE_FIELDS = ['_id', 'userId', 'tourId', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await BOOKING_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdBooking = await GET_DB().collection(BOOKING_COLLECTION_NAME).insertOne(validData)
    const getNewBooking = await findOneById(createdBooking.insertedId)
    return getNewBooking
  } catch (error) { throw new Error(error) }
}

const findOneById = async (bookingId) => {
  try {
    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).findOne({ _id: new ObjectId(bookingId) })
    return result
  } catch (error) { throw new Error(error) }
}

const checkBooking = async (tourId, userId) => {
  try {
    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).findOne({
      tourId: tourId,
      userId: userId,
      status: { $in: ['confirmed', 'completed'] },
      _destroy: false
    })
    return !!result
  } catch (error) { throw new Error(error) }
}

const update = async (bookingId, updateData) => {
  try {
    // Filter fields that can't be updated
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    updateData.updatedAt = Date.now()

    const result = await GET_DB().collection(BOOKING_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(bookingId) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) { throw new Error(error) }
}

export const bookingModel = {
  BOOKING_COLLECTION_NAME,
  BOOKING_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  checkBooking,
  update
}
