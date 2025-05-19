import Joi from 'joi'
import { ObjectId } from 'mongodb/lib/bson'
import { GET_DB } from '~/config/mongodb'
import { EMAIL_RULE, EMAIL_RULE_MESSAGE } from '~/utils/validators'

// Define Collection (name & schema)
const USER_COLLECTION_NAME = 'users'
const USER_COLLECTION_SCHEMA = Joi.object({
  email: Joi.string().required().pattern(EMAIL_RULE).message(EMAIL_RULE_MESSAGE), // unique
  password: Joi.string().required(),
  username: Joi.string().required().trim().strict(),
  displayName: Joi.string().required().trim().strict(),
  avatar: Joi.string().default(null),

  // New role field to differentiate between users and admins
  role: Joi.string().valid('user', 'admin').required(),

  // Optional fields (more common for regular users)
  phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).default(null),
  address: Joi.string().default(null),
  ipAddress: Joi.string().default(null),

  isActive: Joi.boolean().default(false),
  verifyToken: Joi.string(),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Fields that cannot be updated
const INVALID_UPDATE_FIELDS = ['_id', 'email', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await USER_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const createdUser = await GET_DB().collection(USER_COLLECTION_NAME).insertOne(validData)
    const getNewUser = await findOneById(createdUser.insertedId)
    return getNewUser
  } catch (error) { throw new Error(error) }
}

const findOneById = async (userId) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ _id: new ObjectId(userId) })
    return result
  } catch (error) { throw new Error(error) }
}

const findOneByEmail = async (emailValue) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({ email: emailValue })
    return result
  } catch (error) { throw new Error(error) }
}

const findOneByRole = async (id, role) => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOne({
      _id: new ObjectId(id),
      role: role
    })
    return result
  } catch (error) { throw new Error(error) }
}

const update = async (userId, updateData) => {
  try {
    // Filter fields that can't be updated
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    updateData.updatedAt = Date.now()

    const result = await GET_DB().collection(USER_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateData },
      { returnDocument: 'after' } // return the updated document
    )

    return result
  } catch (error) { throw new Error(error) }
}

// Find all admin users
const findAllAdmins = async () => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).find({
      role: 'admin',
      _destroy: false
    }).toArray()
    return result
  } catch (error) { throw new Error(error) }
}

// Find all regular users
const findAllUsers = async () => {
  try {
    const result = await GET_DB().collection(USER_COLLECTION_NAME).find({
      role: 'user',
      _destroy: false
    }).toArray()
    return result
  } catch (error) { throw new Error(error) }
}

// Migration function to merge existing collections
const migrateCollections = async () => {
  try {
    const db = GET_DB()

    // Get existing users and add role
    const existingUsers = await db.collection('users').find({}).toArray()
    const usersWithRole = existingUsers.map(user => ({
      ...user,
      role: 'user'
    }))

    // Get existing admins and add role
    const existingAdmins = await db.collection('admin').find({}).toArray()
    const adminsWithRole = existingAdmins.map(admin => ({
      ...admin,
      role: 'admin',
      // Add fields that might be missing in admin but required in the unified schema
      phoneNumber: admin.phoneNumber || null,
      address: admin.address || null,
      ipAddress: admin.ipAddress || null,
      isActive: admin.isActive !== undefined ? admin.isActive : true
    }))

    // Insert all into new collection
    if (usersWithRole.length > 0) {
      await db.collection(USER_COLLECTION_NAME).insertMany(usersWithRole)
    }

    if (adminsWithRole.length > 0) {
      await db.collection(USER_COLLECTION_NAME).insertMany(adminsWithRole)
    }

    // Create indexes
    await db.collection(USER_COLLECTION_NAME).createIndex({ email: 1 }, { unique: true })
    await db.collection(USER_COLLECTION_NAME).createIndex({ role: 1 })

    return {
      success: true,
      usersMigrated: usersWithRole.length,
      adminsMigrated: adminsWithRole.length
    }
  } catch (error) {
    console.error('Migration error:', error)
    throw new Error(error)
  }
}

export const mergedUserModel = {
  USER_COLLECTION_NAME,
  USER_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findOneByEmail,
  findOneByRole,
  update,
  findAllAdmins,
  findAllUsers,
  migrateCollections
}
