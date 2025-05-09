import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const CONTACT_COLLECTION_NAME = 'contacts'
const CONTACT_COLLECTION_SCHEMA = Joi.object({
  fullName: Joi.string().required(),
  phoneNumber: Joi.string().required(),
  email: Joi.string().required(),
  message: Joi.string().required(),
  reply: Joi.string().allow('', null),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  repliedAt: Joi.date().timestamp('javascript').allow(null).default(null)
})

const createNew = async (data) => {
  const validData = await CONTACT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
  const created = await GET_DB().collection(CONTACT_COLLECTION_NAME).insertOne(validData)
  return created
}

const findAll = async () => {
  return GET_DB().collection(CONTACT_COLLECTION_NAME).find({}).sort({ createdAt: -1 }).toArray()
}

const findOneById = async (id) => {
  return GET_DB().collection(CONTACT_COLLECTION_NAME).findOne({ _id: new ObjectId(id) })
}

const updateReply = async (id, reply) => {
  return GET_DB().collection(CONTACT_COLLECTION_NAME).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { reply, repliedAt: Date.now() } },
    { returnDocument: 'after' }
  )
}

export const contactModel = {
  createNew,
  findAll,
  findOneById,
  updateReply
}