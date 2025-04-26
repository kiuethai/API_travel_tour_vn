import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { bookingController } from '~/controllers/bookingController'
import { bookingValidation } from '~/validations/bookingValidation'

const Router = express.Router()

// Create booking
Router.route('/create')
  .post(
    // authMiddleware.isAuthorized,
    bookingValidation.createBooking,
    bookingController.createBooking
  )

// Check if user has booked a tour
Router.route('/check')
  .post(
    authMiddleware.isAuthorized,
    bookingController.checkBooking
  )

export const bookingRoute = Router