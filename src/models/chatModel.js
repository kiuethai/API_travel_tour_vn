import Joi from 'joi'
import { GET_DB } from '~/config/mongodb'

// Define Collection (name & schema)
const CHAT_COLLECTION_NAME = 'chatMessages'
const CHAT_COLLECTION_SCHEMA = Joi.object({
  // User ID - can be any user with role 'user' or 'admin'
  senderID: Joi.string().required(),
  // Recipient ID - can be any user with role 'user' or 'admin'
  recipientID: Joi.string().required(),
  message: Joi.string().required(),
  readStatus: Joi.boolean().default(false),
  createdDate: Joi.date().timestamp('javascript').default(Date.now),
  ipAddress: Joi.string().allow(null).default(null),
  // Role of the sender for display purposes
  senderRole: Joi.string().valid('user', 'admin').required(),
  attachments: Joi.array().items(Joi.string()).default([])
})

// Validation before creating a new chat message
const validateBeforeCreate = async (data) => {
  return await CHAT_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

/**
 * Create a new chat message
 * @param {Object} data - Chat message data
 * @returns {Object} - The created chat message
 */
const createNew = async (data) => {
  try {
    const validData = await validateBeforeCreate(data)
    const collection = GET_DB().collection(CHAT_COLLECTION_NAME)
    // Insert the document
    const result = await collection.insertOne(validData)
    // Get the newly created document
    const newMessage = await collection.findOne({ _id: result.insertedId })
    return newMessage
  } catch (error) { throw new Error(error) }
}

/**
 * Find messages between a user and admin
 * @param {string} userId - User ID
 * @param {string} adminId - Admin ID
 * @returns {Array} - List of messages
 */
const findMessages = async (userId, adminId) => {
  try {
    // Nếu người gọi có role là admin, chỉ cần truy vấn dựa trên userId
    // eslint-disable-next-line no-undef
    if (arguments.length === 1 || adminId === 'admin') {
      // Admin đang xem tin nhắn của một user cụ thể
      const result = await GET_DB().collection(CHAT_COLLECTION_NAME)
        .find({
          $or: [
            // Tất cả tin nhắn giữa user và bất kỳ admin nào
            { senderID: userId, senderRole: 'user' },
            { recipientID: userId, senderRole: 'admin' }
          ]
        })
        .sort({ createdDate: 1 })
        .toArray()
      return result
    } else {
      // Trường hợp thông thường - tìm tin nhắn giữa user và admin cụ thể
      const result = await GET_DB().collection(CHAT_COLLECTION_NAME)
        .find({
          $or: [
            { senderID: userId, recipientID: adminId },
            { senderID: adminId, recipientID: userId }
          ]
        })
        .sort({ createdDate: 1 })
        .toArray()
      return result
    }
  } catch (error) { throw new Error(error) }
}

/**
 * Get all admin conversations
 * @param {string} adminId - Admin ID
 * @returns {Array} - Unique conversations with users
 */
const getAdminConversations = async (adminId) => {
  try {
    const pipeline = [
      {
        $match: {
          $or: [
            { senderID: adminId, senderRole: 'admin' },
            { recipientID: adminId, senderRole: 'user' }
          ]
        }
      },
      { $sort: { createdDate: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderRole', 'admin'] },
              '$recipientID', // If admin is the sender, group by recipient
              '$senderID'     // If user is the sender, group by sender
            ]
          },
          lastMessage: { $first: '$message' },
          lastMessageDate: { $first: '$createdDate' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$senderRole', 'user'] },
                    { $eq: ['$readStatus', false] }
                  ]
                },
                1,
                0
              ]
            }
          },
          userID: {
            $first: {
              $cond: [
                { $eq: ['$senderRole', 'admin'] },
                '$recipientID', // If admin is the sender, the user is the recipient
                '$senderID'     // If user is the sender, the user is the sender
              ]
            }
          }
        }
      },
      { $sort: { lastMessageDate: -1 } }
    ]
    const result = await GET_DB().collection(CHAT_COLLECTION_NAME).aggregate(pipeline).toArray()
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Get all user conversations
 * @param {string} userId - User ID
 * @returns {Array} - Unique conversations with admins
 */
const getUserConversations = async (userId) => {
  try {
    // Đơn giản hóa: người dùng chỉ nhìn thấy các cuộc trò chuyện với role admin
    const pipeline = [
      {
        $match: {
          $or: [
            { senderID: userId, senderRole: 'user' },
            { recipientID: userId, senderRole: 'admin' }
          ]
        }
      },
      {
        $sort: { createdDate: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderRole', 'user'] },
              '$recipientID', // If user is the sender, group by recipient (admin)
              '$senderID'     // If admin is the sender, group by sender (admin)
            ]
          },
          lastMessage: { $first: '$message' },
          lastMessageDate: { $first: '$createdDate' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$senderRole', 'admin'] },
                    { $eq: ['$readStatus', false] }
                  ]
                },
                1,
                0
              ]
            }
          },
          adminID: {
            $first: {
              $cond: [
                { $eq: ['$senderRole', 'user'] },
                '$recipientID', // If user is the sender, the admin is the recipient
                '$senderID'     // If admin is the sender, the admin is the sender
              ]
            }
          }
        }
      },
      { $sort: { lastMessageDate: -1 } }
    ]
    const result = await GET_DB().collection(CHAT_COLLECTION_NAME).aggregate(pipeline).toArray()
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Mark messages as read
 * @param {Object} filter - Filter criteria
 * @returns {Object} - Update result
 */
const markAsRead = async (filter) => {
  try {
    const result = await GET_DB().collection(CHAT_COLLECTION_NAME)
      .updateMany(
        filter,
        { $set: { readStatus: true } }
      )
    return result
  } catch (error) { throw new Error(error) }
}

/**
 * Find all messages for a user
 * @param {string} userId - User ID
 * @returns {Array} - List of all messages for the user
 */
const findAllUserMessages = async (userId) => {
  try {
    const result = await GET_DB().collection(CHAT_COLLECTION_NAME)
      .find({
        $or: [
          { senderID: userId },
          { recipientID: userId }
        ]
      })
      .sort({ createdDate: 1 })
      .toArray()
    return result
  } catch (error) { throw new Error(error) }
}

// Create indexes when the module is loaded
const createIndexes = async () => {
  const db = GET_DB()
  if (db) {
    try {
      // Create indexes for faster queries
      await db.collection(CHAT_COLLECTION_NAME).createIndex({ senderID: 1, recipientID: 1 })
      await db.collection(CHAT_COLLECTION_NAME).createIndex({ senderID: 1 })
      await db.collection(CHAT_COLLECTION_NAME).createIndex({ recipientID: 1 })
      await db.collection(CHAT_COLLECTION_NAME).createIndex({ senderRole: 1 })
      await db.collection(CHAT_COLLECTION_NAME).createIndex({ createdDate: -1 })
    } catch (error) {
      // Silently handle error
    }
  }
}

// Try to create indexes when this module is imported
createIndexes().catch(() => { })

export const chatModel = {
  CHAT_COLLECTION_NAME,
  CHAT_COLLECTION_SCHEMA,
  createNew,
  findMessages,
  getAdminConversations,
  getUserConversations,
  markAsRead,
  findAllUserMessages
}
