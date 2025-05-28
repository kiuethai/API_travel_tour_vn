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
    // Kiểm tra nếu là admin, không cần adminId cụ thể
    if (req.user.role === 'admin') {
      const messages = await chatModel.findMessages(userId)
      return res.json({
        success: true,
        messages
      })
    }

    // Cách xử lý hiện tại nếu không phải admin
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
    const userId = req.user.id
    console.log('userId', userId)
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
    const { recipientID, message, attachments } = req.body
    // console.log('recipientId, message, attachments', recipientId, message, attachments)
    if (!recipientID || !message) {
      return next(new ApiError(400, 'Recipient ID and message are required'))
    }

    const senderID = req.user.id
    const senderRole = req.user.role

    // Create and save the message
    const newMessage = await chatModel.createNew({
      senderID,
      recipientID: recipientID,
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

/**
 * Get all messages between a user and any admin
 * This is specifically for the client chat interface
 */
const getUserAdminMessages = async (req, res, next) => {
  try {
    const { userId } = req.params

    // Ensure the requesting user is only getting their own messages
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return next(new ApiError(403, 'Not authorized to access these messages'))
    }

    // Get all messages between this user and any admin
    const messages = await chatModel.findMessagesWithAdmin(userId)
    res.json({
      success: true,
      messages
    })
  } catch (error) {
    // Use next with error instead of console.error
    next(new ApiError(500, 'Error fetching admin messages'))
  }
}

export const chatController = {
  getAdminConversations,
  getMessages,
  getUserConversations,
  getUserMessages,
  sendMessage,
  getUserAdminMessages
}

