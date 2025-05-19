// Migration script for merging user and admin collections and updating chat messages
import { mergedUserModel } from '~/models/mergedUserModel'
import { chatMigration } from '~/models/chatMigration'
import { GET_DB } from '~/config/mongodb'

/**
 * Run the complete migration process
 * 1. Merge user and admin collections into a single collection with role field
 * 2. Migrate chat messages to work with the new user model
 * 3. Update indexes
 * 4. Delete old admin collection
 */
const runMigration = async () => {
  console.log('Starting migration process...')

  try {
    // 1. Merge user and admin collections
    console.log('Merging user and admin collections...')
    const userMigrationResult = await mergedUserModel.migrateCollections()
    console.log('User migration completed:', userMigrationResult)

    // 2. Migrate chat messages
    console.log('Migrating chat messages...')
    const chatMigrationResult = await chatMigration.migrateChatMessages()
    console.log('Chat migration completed:', chatMigrationResult)

    // 3. Create any additional indexes
    const db = GET_DB()
    await db.collection('users').createIndex({ role: 1 })
    await db.collection('users').createIndex({ email: 1 }, { unique: true })

    // 4. Delete old admin collection if migration was successful
    if (userMigrationResult.success && userMigrationResult.adminsMigrated > 0) {
      console.log('Removing old admin collection...')
      await db.collection('admin').drop().catch(err => {
        console.log('Admin collection might not exist or error dropping it:', err.message)
      })
    }

    console.log('Migration completed successfully!')
    return {
      success: true,
      users: userMigrationResult,
      chats: chatMigrationResult
    }
  } catch (error) {
    console.error('Migration failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export const migrationScript = {
  runMigration
}
