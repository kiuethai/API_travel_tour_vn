import { env } from '~/config/environment'
import { MongoClient, ServerApiVersion } from 'mongodb'
let trelloDatabaseInstance = null
const mongoClientInstance = new MongoClient(env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
})

export const CONNECT_DB = async () => {
  await mongoClientInstance.connect()

  trelloDatabaseInstance = mongoClientInstance.db(env.DATABASE_NAME)

}

// Đóng kết nối tới Database khi cần
export const CLOSE_DB = async () => {
  console.log('test')
  await mongoClientInstance.close()
}

export const GET_DB = () => {
  if (!trelloDatabaseInstance) throw new Error('Must connect to Database First!')
  return trelloDatabaseInstance
}
