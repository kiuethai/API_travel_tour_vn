// Migration execution script
// Run this file directly with Node.js to perform the migration

import { env } from '../config/environment'
import { CONNECT_DB, CLOSE_DB } from '../config/mongodb'
import { migrationScript } from './migration'

const runMigrationProcess = async () => {
  try {
    // Connect to the database
    await CONNECT_DB()
    console.log('Connected to MongoDB')

    // Run the migration
    const result = await migrationScript.runMigration()

    if (result.success) {
      console.log('Migration completed successfully')
      console.log('User migration:', result.users)
      console.log('Chat migration:', result.chats)
    } else {
      console.error('Migration failed:', result.error)
    }
  } catch (error) {
    console.error('Error during migration:', error)
  } finally {
    // Close the database connection
    await CLOSE_DB()
    console.log('Disconnected from MongoDB')
    process.exit(0)
  }
}

// Execute the migration
runMigrationProcess()
