import { reviewModel } from '~/models/reviewModel'
import { tourModel } from '~/models/tourModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { userModel } from '~/models/userModel'
import { bookingModel } from '~/models/bookingModel'

const addReview = async ({ tourId, userId, rating, comment }) => {
  // Kiểm tra tour đã hoàn thành chưa
  const tour = await tourModel.findOneById(tourId)
  if (!tour) throw new ApiError(StatusCodes.NOT_FOUND, 'Tour không tồn tại')
  if (tour.availability !== false) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Hãy tham gia cùng chúng tôi để cảm nhận vẻ đẹp của tour này')
  }

  const bookings = await bookingModel.findOne({
    tourId: tourId,
    userId: userId,
    status: 'completed'
  })
  if (!bookings) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Hãy tham gia cùng chúng tôi để cảm nhận vẻ đẹp của tour này')
  }

  // Thêm review
  const review = {
    tourId,
    userId,
    rating,
    comment,
    timestamp: new Date()
  }
  const result = await reviewModel.createReview(review)
  // Lấy _id của review vừa tạo
  const reviewId = result.insertedId

  // Thêm reviewId vào trường reviews của tour
  await tourModel.pushReviewId(tourId, reviewId)

  return { ...review, _id: reviewId }
}

const getReviewByTourId = async (tourId) => {
  // Lấy tất cả review của tour
  const reviews = await reviewModel.findReviewsByTourId(tourId)
  // console.log('🚀 ~ getReviewByTourId ~ reviews:', reviews)
  const detailed = await Promise.all(
    reviews.map(async r => {
      const user = await userModel.findOneById(r.userId)
      return {
        userId: r.userId,
        email: user?.email || null,
        username: user?.username || null,
        avatar: user?.avatar || null,
        rating: r.rating,
        comment: r.comment,
        timestamp: r.timestamp
      }
    })
  )
  return detailed
}

export const reviewService = {
  addReview,
  getReviewByTourId

}