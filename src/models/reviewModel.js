import { GET_DB } from '~/config/mongodb'

const COLLECTION_NAME = 'reviews'

const createReview = async (data) => {
  const db = await GET_DB()
  const result = await db.collection(COLLECTION_NAME).insertOne(data)
  return result
}

const findReviewsByTourId = async (tourId) => {
  const db = await GET_DB()
  const reviews = await db.collection(COLLECTION_NAME).find({ tourId: tourId }).toArray()
  return reviews
}


export const reviewModel = {
  createReview,
  findReviewsByTourId
}