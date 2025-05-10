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

Router.route('/payment/momo')
  .post(
    bookingController.momoBooking
  )

// Lấy tất cả các tour trong hệ thống
Router.route('/getAllTourBooking')
  .get(
    authMiddleware.isAuthorized,
    bookingController.getAllToursBooking
  )

Router.route('/updateBooking/:id')
  .put(
    authMiddleware.isAuthorized,
    bookingController.updateBooking
  )

// Lấy các tour mà người dùng đã đặt dựa vào userId
Router.route('/getUserTours/:userId')
  .get(
    authMiddleware.isAuthorized,
    bookingController.getTourByUserId
  )

Router.route('/getTourByBookingId/:bookingId')
  .get(
    authMiddleware.isAuthorized,
    bookingController.getTourByBookingId
  )

Router.route('/sendInvoice/:bookingId')
  .post(
    authMiddleware.isAuthorized,
    bookingController.sendInvoiceByBookingId
  )

export const bookingRoute = Router