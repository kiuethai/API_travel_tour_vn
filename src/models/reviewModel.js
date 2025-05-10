import { GET_DB } from '~/config/mongodb'

const COLLECTION_NAME = 'reviews'

export const reviewModel = {
  async createReview(data) {
    const db = await GET_DB()
    const result = await db.collection(COLLECTION_NAME).insertOne(data)
    return result
  },
  async findReviewsByTourId(tourId) {
    const db = await GET_DB()
    return db.collection(COLLECTION_NAME).find({ tourID: tourId }).toArray()
  }
}