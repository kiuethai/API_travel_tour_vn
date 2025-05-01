/* eslint-disable no-useless-catch */
import { bookingModel } from '~/models/bookingModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'
import { tourModel } from '~/models/tourModel'

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
    // Lấy tất cả bookings từ database
    const bookings = await bookingModel.findAll()

    // Nếu không có booking nào, trả về mảng rỗng
    if (!bookings || bookings.length === 0) {
      return []
    }
    // Trả về dữ liệu bookings trực tiếp
    return bookings
  } catch (error) {
    throw error
  }
}

/**
 * Lấy tất cả các tour mà người dùng đã đặt
 * @param {string} userId - ID của người dùng
 * @returns {Array} - Danh sách các tour đã đặt kèm thông tin đặt tour
 */
const getUserTours = async (userId) => {
  try {
    // Lấy tất cả bookings của user từ database
    const bookings = await bookingModel.findBookingsByUserId(userId)

    // Nếu không có booking nào, trả về mảng rỗng
    if (!bookings || bookings.length === 0) {
      return []
    }

    // Lấy chi tiết tour cho mỗi booking
    const toursWithBookingInfo = await Promise.all(
      bookings.map(async (booking) => {
        try {
          const tourDetails = await tourModel.findOneById(booking.tourId)

          // Kết hợp thông tin booking và tour
          return {
            bookingInfo: {
              bookingId: booking._id,
              bookingDate: booking.createdAt,
              status: booking.status,
              adults: booking.numAdults,
              children: booking.numChildren,
              totalPrice: booking.totalPrice
            },
            tourDetails: tourDetails || { message: 'Tour không còn tồn tại' }
          }
        } catch (error) {
          // Nếu tour không tồn tại hoặc có lỗi, vẫn trả về thông tin booking
          return {
            bookingInfo: {
              bookingId: booking._id,
              bookingDate: booking.createdAt,
              status: booking.status,
              adults: booking.numAdults,
              children: booking.numChildren,
              totalPrice: booking.totalPrice
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
