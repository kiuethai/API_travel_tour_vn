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

Router.route('/payment/paypal')
  .get(
    bookingController.paypalBooking
  )

// Lấy tất cả các tour trong hệ thống
Router.route('/getAllTourBooking')
  .get(
    authMiddleware.isAuthorized,
    bookingController.getAllToursBooking
  )

// Lấy các tour mà người dùng đã đặt dựa vào userId
Router.route('/getUserTours/:userId')
  .get(
    authMiddleware.isAuthorized,
    bookingController.getTourByUserId
  )

export const bookingRoute = Router