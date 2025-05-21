import socketIO from 'socket.io'
import { chatModel } from '../models/chatModel'
import { JwtProvider } from '../providers/JwtProvider'
import { env } from '../config/environment'

/**
 * Socket.io Chat Implementation
 * This module handles real-time chat functionality between users and admins
 */

export const setupChatSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*', // Update with your frontend URL in production
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  // Keep track of connected users and admins
  const connectedClients = {
    users: new Map(), // userId -> socketId
    admins: new Map()// adminId -> socketId
  }

  // Keep track of who is typing
  const typingUsers = new Map() // userId_adminId -> boolean

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      console.log('Socket token:', token)
      if (!token) {
        return next(new Error('Authentication error'))
      }
      // Use the ACCESS_TOKEN_SECRET_SIGNATURE from environment variables
      const decoded = await JwtProvider.verifyToken(token, env.ACCESS_TOKEN_SECRET_SIGNATURE)
      console.log('Decoded token:', decoded)
      if (!decoded) {
        return next(new Error('Invalid token'))
      }

      // Save the user/admin info in the socket
      socket.user = {
        id: decoded.id,
        role: decoded.role
      }

      next()
    } catch (error) {
      console.error('Socket authentication error:', error)
      next(new Error('Authentication error'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    // Store the connection based on role
    if (socket.user) {
      if (socket.user.role === 'admin') {
        connectedClients.admins.set(socket.user.id, socket.id)
        console.log(`Admin connected: ${socket.user.id}`)
      } else {
        connectedClients.users.set(socket.user.id, socket.id)
        console.log(`User connected: ${socket.user.id}`)
      }
    }    // Handle joining a chat
    socket.on('join-chat', async (data) => {
      try {
        // Admin joining a chat with specific user
        if (socket.user.role === 'admin' && data.userId) {
          const roomId = `chat:${data.userId}_${socket.user.id}`
          socket.join(roomId)

          // Fetch previous messages
          const messages = await chatModel.findMessages(data.userId, socket.user.id)
          socket.emit('chat-history', messages)
        }
        // User joining their own chat
        else if (socket.user.role === 'user') {
          // If an admin ID is provided, join that specific chat
          if (data.adminId) {
            const roomId = `chat:${socket.user.id}_${data.adminId}`
            socket.join(roomId)

            // Fetch previous messages with this admin
            const messages = await chatModel.findMessages(socket.user.id, data.adminId)
            socket.emit('chat-history', messages)
          } else {
            // If no admin specified, get all messages for this user
            const messages = await chatModel.findAllUserMessages(socket.user.id)
            socket.emit('chat-history', messages)
          }
        }
      } catch (error) {
        console.error('Error joining chat:', error)
        socket.emit('error', { message: 'Error joining chat' })
      }
    })

    // Handle sending a message
    socket.on('send-message', async (data) => {
      try {
        // Support both recipientId and recipientID
        const recipientID = data.recipientID || data.recipientId;
        const { message, attachments = [] } = data;

        console.log('Send message request:', data);

        if (!recipientID) {
          return socket.emit('error', { message: 'Recipient ID is required' });
        }

        // Record client IP if available
        const ipAddress = socket.handshake.address || null;

        // Create and save the message
        const newMessage = await chatModel.createNew({
          senderID: socket.user.id,
          recipientID: recipientID,
          message,
          senderRole: socket.user.role,
          ipAddress,
          attachments,
          readStatus: false,
          createdDate: new Date()
        });

        // Construct room ID - we need to ensure consistent ordering for the room ID
        // to make sure both parties join the same room
        const roomId = socket.user.role === 'user'
          ? `chat:${socket.user.id}_${recipientID}`
          : `chat:${recipientID}_${socket.user.id}`;

        // Broadcast the message to the room
        io.to(roomId).emit('new-message', newMessage);

        // Send notification to offline recipient
        if (socket.user.role === 'user') {
          const adminSocketId = connectedClients.admins.get(recipientID);
          if (adminSocketId) {
            io.to(adminSocketId).emit('chat-notification', {
              from: socket.user.id,
              message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
            });
          }
        } else {
          const userSocketId = connectedClients.users.get(recipientID);
          if (userSocketId) {
            io.to(userSocketId).emit('chat-notification', {
              from: socket.user.id,
              message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
            });
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    })
    // Handle marking messages as read
    socket.on('mark-as-read', async (data) => {
      try {
        const { recipientId } = data

        // Determine which messages to mark as read based on role
        let filter = {}
        if (socket.user.role === 'admin') {
          filter = {
            senderID: recipientId,
            recipientID: socket.user.id,
            senderRole: 'user', // Admin is reading user messages
            readStatus: false
          }
        } else {
          filter = {
            senderID: recipientId,
            recipientID: socket.user.id,
            senderRole: 'admin', // User is reading admin messages
            readStatus: false
          }
        }

        // Update the read status
        await chatModel.markAsRead(filter)

        // Notify the room about read status update
        const roomId = socket.user.role === 'user'
          ? `chat:${socket.user.id}_${recipientId}`
          : `chat:${recipientId}_${socket.user.id}`

        io.to(roomId).emit('messages-read', {
          senderID: recipientId,
          recipientID: socket.user.id
        })
      } catch (error) {
        console.error('Error marking messages as read:', error)
        socket.emit('error', { message: 'Error updating read status' })
      }
    })    // Handle typing indicators
    socket.on('typing', (data) => {
      try {
        const { recipientId, isTyping } = data

        // Store typing status with consistent key format
        const typingKey = socket.user.role === 'user'
          ? `${socket.user.id}_${recipientId}`
          : `${recipientId}_${socket.user.id}`

        typingUsers.set(typingKey, {
          userId: socket.user.id,
          isTyping
        })

        // Construct room ID with consistent format
        const roomId = socket.user.role === 'user'
          ? `chat:${socket.user.id}_${recipientId}`
          : `chat:${recipientId}_${socket.user.id}`

        // Broadcast typing status to the room
        io.to(roomId).emit('typing', {
          userId: socket.user.id,
          isTyping
        })
      } catch (error) {
        console.error('Error handling typing indicator:', error)
      }
    })

    // Handle getting chat history
    socket.on('get-chat-history', async (data) => {
      try {
        console.log('Get chat history request:', data)
        const { recipientId } = data

        if (!recipientId) {
          return socket.emit('error', { message: 'Recipient ID is required' })
        }

        let messages = []

        // If admin requesting chat with a user
        if (socket.user.role === 'admin') {
          console.log(`Admin ${socket.user.id} requesting chat history with user ${recipientId}`)
          messages = await chatModel.findMessages(recipientId, socket.user.id)

          // Make sure we're in the right room
          const roomId = `chat:${recipientId}_${socket.user.id}`
          socket.join(roomId)
        }
        // If user requesting chat with admin
        else if (socket.user.role === 'user') {
          console.log(`User ${socket.user.id} requesting chat history with admin ${recipientId}`)
          messages = await chatModel.findMessages(socket.user.id, recipientId)

          // Make sure we're in the right room
          const roomId = `chat:${socket.user.id}_${recipientId}`
          socket.join(roomId)
        }

        console.log(`Sending ${messages.length} messages to ${socket.id}`)
        socket.emit('chat-history', messages)
      } catch (error) {
        console.error('Error getting chat history:', error)
        socket.emit('error', { message: 'Error getting chat history' })
      }
    })

    // Handle joining a chat with recipientId
    socket.on('join-chat-room', async (data) => {
      try {
        console.log('Join chat room request:', data)
        const { recipientId } = data

        if (!recipientId) {
          return socket.emit('error', { message: 'Recipient ID is required' })
        }

        let roomId = ''

        // Admin joining chat with user
        if (socket.user.role === 'admin') {
          roomId = `chat:${recipientId}_${socket.user.id}`
        }
        // User joining chat with admin
        else {
          roomId = `chat:${socket.user.id}_${recipientId}`
        }

        console.log(`Socket ${socket.id} joining room ${roomId}`)
        socket.join(roomId)
        socket.emit('room-joined', { roomId })
      } catch (error) {
        console.error('Error joining chat room:', error)
        socket.emit('error', { message: 'Error joining chat room' })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)

      if (socket.user) {
        if (socket.user.role === 'admin') {
          connectedClients.admins.delete(socket.user.id)
          console.log(`Admin disconnected: ${socket.user.id}`)
        } else {
          connectedClients.users.delete(socket.user.id)
          console.log(`User disconnected: ${socket.user.id}`)
        }
      }
    })
  })

  return io
}
