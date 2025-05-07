/* eslint-disable no-useless-catch */
import { bookingModel } from '~/models/bookingModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb/lib/bson'
import { tourModel } from '~/models/tourModel'
import { checkoutModel } from '~/models/checkoutModel' // Thêm dòng này
import { GET_DB } from '~/config/mongodb'
const createBooking = async (bookingData) => {
  try {
    // Validate tour ID
    if (!ObjectId.isValid(bookingData.tourId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tour ID không hợp lệ')
    }

    // Create the booking
    const booking = await bookingModel.createNew(bookingData)
    if (!booking) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Không thể tạo booking')
    }
    return booking
  } catch (error) { throw error }
}

const checkBooking = async (tourId, userId) => {
  try {
    // Validate IDs
    if (!ObjectId.isValid(tourId) || !ObjectId.isValid(userId)) {
      return false
    }

    // Check if user has a confirmed booking for this tour
    return await bookingModel.checkBooking(tourId, userId)
  } catch (error) { throw error }
}


const getAllToursBooking = async () => {
  try {
    const bookings = await bookingModel.findAll()
    if (!bookings || bookings.length === 0) {
      return []
    }

    // Lấy paymentMethod từ checkout theo bookingId
    const bookingsWithPayment = await Promise.all(
      bookings.map(async (booking) => {
        let paymentMethod = null
        try {
          // Tìm checkout theo bookingId
          const checkout = await checkoutModel.findOneByBookingId
            ? await checkoutModel.findOneByBookingId(booking._id.toString())
            : await GET_DB().collection('checkouts').findOne({ bookingId: booking._id.toString() })
          paymentMethod = checkout?.paymentMethod || null
        } catch (error) {
          throw error
        }
        return { ...booking, paymentMethod }
      })
    )
    return bookingsWithPayment
  } catch (error) {
    throw error
  }
}

const getUserTours = async (userId) => {
  try {
    const bookings = await bookingModel.findBookingsByUserId(userId)
    if (!bookings || bookings.length === 0) {
      return []
    }

    const toursWithBookingInfo = await Promise.all(
      bookings.map(async (booking) => {
        let paymentMethod = null
        try {
          // Tìm checkout theo bookingId
          const checkout = await checkoutModel.findOneByBookingId
            ? await checkoutModel.findOneByBookingId(booking._id.toString())
            : await GET_DB().collection('checkouts').findOne({ bookingId: booking._id.toString() })
          paymentMethod = checkout?.paymentMethod || null
        } catch (error) {
          throw error
        }

        try {
          const tourDetails = await tourModel.findOneById(booking.tourId)
          return {
            bookingInfo: {
              bookingId: booking._id,
              bookingDate: booking.createdAt,
              status: booking.status,
              adults: booking.numAdults,
              children: booking.numChildren,
              totalPrice: booking.totalPrice,
              address: booking.address,
              phoneNumber: booking.phoneNumber,
              email: booking.email,
              fullName: booking.fullName,
              paymentMethod
            },
            tourDetails: tourDetails || { message: 'Tour không còn tồn tại' }
          }
        } catch (error) {
          return {
            bookingInfo: {
              bookingId: booking._id,
              bookingDate: booking.createdAt,
              status: booking.status,
              adults: booking.numAdults,
              children: booking.numChildren,
              totalPrice: booking.totalPrice,
              paymentMethod
            },
            tourDetails: { message: 'Không thể lấy thông tin tour' }
          }
        }
      })
    )

    return toursWithBookingInfo
  } catch (error) {
    throw error
  }
}
export const bookingService = {
  createBooking,
  checkBooking,
  getAllToursBooking,
  getUserTours
}
