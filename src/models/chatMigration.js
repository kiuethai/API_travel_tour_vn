// Migration script for chat messages to work with the merged user model
import { GET_DB } from '~/config/mongodb'

/**
 * Migrate chat messages to the new schema
 * This function updates all chat messages to use senderID/recipientID instead of userID/adminID
 * and updates the sender field to senderRole
 */
const migrateChatMessages = async () => {
  try {
    const db = GET_DB()
    const chatCollection = db.collection('chatMessages')

    // Get all existing chat messages
    const messages = await chatCollection.find({}).toArray()
    console.log(`Found ${messages.length} chat messages to migrate`)

    let migratedCount = 0
    let errorCount = 0

    // Process each message
    for (const message of messages) {
      try {
        // Skip already migrated messages
        if (message.senderID && message.recipientID && message.senderRole) {
          continue
        }

        // Extract the fields we need
        const { userID, adminID, sender, _id } = message

        // Determine sender and recipient IDs based on the sender field
        const senderID = sender === 'user' ? userID : adminID
        const recipientID = sender === 'user' ? adminID : userID
        const senderRole = sender

        // Update the document with new schema
        await chatCollection.updateOne(
          { _id },
          {
            $set: {
              senderID,
              recipientID,
              senderRole
            },
            $unset: {
              userID: " ",
              adminID: "",
              sender: ""
            }
          }
        )

        migratedCount++
      } catch (error) {
        console.error(`Error migrating message ${message._id}:`, error)
        errorCount++
      }
    }

    // Create new indexes for the updated schema
    await chatCollection.createIndex({ senderID: 1, recipientID: 1 })
    await chatCollection.createIndex({ senderID: 1 })
    await chatCollection.createIndex({ recipientID: 1 })
    await chatCollection.createIndex({ senderRole: 1 })

    return {
      success: true,
      total: messages.length,
      migrated: migratedCount,
      errors: errorCount
    }
  } catch (error) {
    console.error('Chat migration error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export const chatMigration = {
  migrateChatMessages
}
