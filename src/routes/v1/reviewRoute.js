import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { reviewController } from '~/controllers/reviewController'

const Router = express.Router()

Router.route('/')
  .post(
    authMiddleware.isAuthorized,
    reviewController.addReview
  )

Router.route('/:id')
  .get(
    // authMiddleware.isAuthorized,
    reviewController.getReviewByTourId
  )
// .put(
//   authMiddleware.isAuthorized,
//   reviewController.updateReview
// )
// .delete(
//   authMiddleware.isAuthorized,
//   reviewController.deleteReview
// )

export const reviewRoute = Router