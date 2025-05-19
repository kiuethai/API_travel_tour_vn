import express from 'express'
import { chatController } from '~/controllers/chatController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()


// Get messages between authenticated user and other party
Router.get('/messages/:id',
  authMiddleware.isAuthorized,
  (req, res, next) => {
    const { id } = req.params
    if (req.user.role === 'admin') {
      // admin retrieving messages with user
      req.params.userId = id
      return chatController.getMessages(req, res, next)
    }
    // user retrieving messages with admin
    req.params.adminId = id
    return chatController.getUserMessages(req, res, next)
  }
)

// Generic conversations endpoin0t that routes based on authenticated user role
Router.get('/conversations',
  authMiddleware.isAuthorized,
  (req, res, next) => {
    // Use req.user set by authMiddleware
    const role = req.user?.role
    if (role === 'admin') {
      return chatController.getAdminConversations(req, res, next)
    }
    // default to 'user' if role is not 'admin'
    return chatController.getUserConversations(req, res, next)
  }
)

// Common routes
Router.post('/messages',
  authMiddleware.isAuthorized,
  chatController.sendMessage
)

export const chatRoutes = Router