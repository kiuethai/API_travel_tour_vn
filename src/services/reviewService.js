import { reviewModel } from '~/models/reviewModel'
import { tourModel } from '~/models/tourModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'

const addReview = async ({ tourID, userID, rating, comment }) => {
  // Kiểm tra tour đã hoàn thành chưa
  const tour = await tourModel.findOneById(tourID)
  if (!tour) throw new ApiError(StatusCodes.NOT_FOUND, 'Tour không tồn tại')
  if (tour.availability !== false) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Chỉ có thể review khi tour đã hoàn thành')
  }
  // Thêm review
  const review = {
    tourID,
    userID,
    rating,
    comment,
    timestamp: new Date()
  }
  const result = await reviewModel.createReview(review)
  // Lấy _id của review vừa tạo
  const reviewId = result.insertedId

  // Thêm reviewId vào trường reviews của tour
  await tourModel.pushReviewId(tourID, reviewId)

  return { ...review, _id: reviewId }
}


export const reviewService = { addReview }