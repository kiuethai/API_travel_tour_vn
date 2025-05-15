import { StatusCodes } from 'http-status-codes'
import { reviewService } from '~/services/reviewService'


const addReview = async (req, res, next) => {
  try {
    const review = await reviewService.addReview(req.body)
    res.status(StatusCodes.OK).json(review)
  } catch (error) {
    next(error)
  }
}

const getReviewByTourId = async (req, res, next) => {
  const $tourId = req.params.id
  try {
    const reviews = await reviewService.getReviewByTourId($tourId)
    res.status(StatusCodes.OK).json({
      success: true,
      reviews: reviews
    })
  } catch (error) {
    next(error)
  }

}

export const reviewController = {
  addReview,
  getReviewByTourId
}
