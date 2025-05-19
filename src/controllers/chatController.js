import { chatModel } from '~/models/chatModel'
import ApiError from '~/utils/ApiError'

/**
 * Get all chat conversations for an admin
 */
const getAdminConversations = async (req, res, next) => {
  try {
    const adminId = req.user.id

    // Get unique users who have chatted with this admin
    const conversations = await chatModel.getAdminConversations(adminId)

    res.json({
      success: true,
      conversations
    })
  } catch (error) {
    next(new ApiError(500, 'Error fetching conversations'))
  }
}

/**
 * Get chat messages between a user and admin
 */
const getMessages = async (req, res, next) => {
  try {
    const { userId } = req.params
    const adminId = req.user.id

    const messages = await chatModel.findMessages(userId, adminId)

    res.json({
      success: true,
      messages
    })
  } catch (error) {
    next(new ApiError(500, 'Error fetching messages'))
  }
}

/**
 * Get all conversations for a user
 */
const getUserConversations = async (req, res, next) => {
  try {
    const userId = req.users.id

    // Get unique admins who have chatted with this user
    const conversations = await chatModel.getUserConversations(userId)

    res.json({
      success: true,
      conversations
    })
  } catch (error) {
    next(new ApiError(500, 'Error fetching conversations'))
  }
}

/**
 * Get messages between user and an admin
 */
const getUserMessages = async (req, res, next) => {
  try {
    const userId = req.user.id
    const { adminId } = req.params

    const messages = await chatModel.findMessages(userId, adminId)

    res.json({
      success: true,
      messages
    })
  } catch (error) {
    next(new ApiError(500, 'Error fetching messages'))
  }
}

/**
 * Send a message via REST API (fallback for when socket isn't available)
 */
const sendMessage = async (req, res, next) => {
  try {
    const { recipientId, message, attachments } = req.body
    // console.log('recipientId, message, attachments', recipientId, message, attachments)
    if (!recipientId || !message) {
      return next(new ApiError(400, 'Recipient ID and message are required'))
    }

    const senderID = req.user.id
    const senderRole = req.user.role

    // Create and save the message
    const newMessage = await chatModel.createNew({
      senderID,
      recipientID: recipientId,
      message,
      senderRole,
      attachments: attachments || [],
      ipAddress: req.ip,
      readStatus: false,
      createdDate: new Date()
    })

    res.status(201).json({
      success: true,
      message: newMessage
    })
  } catch (error) {
    next(new ApiError(500, 'Error sending message'))
  }
}

export const chatController = {
  getAdminConversations,
  getMessages,
  getUserConversations,
  getUserMessages,
  sendMessage
}

