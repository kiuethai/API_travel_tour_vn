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


// ...existing code...
const getAllToursBooking = async () => {
  try {
    const bookings = await bookingModel.findAll()
    if (!bookings || bookings.length === 0) {
      return []
    }

    // Lấy paymentMethod, paymentStatus từ checkout và title từ tour
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        let paymentMethod = null
        let paymentStatus = null
        let tourTitle = null
        try {
          // Lấy thông tin checkout
          const checkout = await checkoutModel.findOneByBookingId
            ? await checkoutModel.findOneByBookingId(booking._id.toString())
            : await GET_DB().collection('checkouts').findOne({ bookingId: booking._id.toString() })
          paymentMethod = checkout?.paymentMethod || null
          paymentStatus = checkout?.paymentStatus || null
        } catch (error) {
          // Bỏ qua lỗi checkout
        }
        try {
          // Lấy thông tin tour
          const tour = await tourModel.findOneById(booking.tourId)
          tourTitle = tour?.title || null
        } catch (error) {
          // Bỏ qua lỗi tour
        }
        return {
          ...booking,
          paymentMethod,
          paymentStatus,
          tourTitle
        }
      })
    )
    return bookingsWithDetails
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

const updateBookingStatus = async (bookingId, status) => {
  try {
    const updated = await bookingModel.update(bookingId, { status })
    return updated
  } catch (error) {
    throw error
  }
}

const updateCheckoutPaymentStatus = async (bookingId, paymentStatus) => {
  try {
    const checkout = await checkoutModel.findOneByBookingId(bookingId)
    if (checkout) {
      await checkoutModel.update(checkout._id, { paymentStatus })
    }
  } catch (error) {
    throw error
  }
}

const getTourByBookingId = async (bookingId) => {
  try {
    const booking = await bookingModel.findOneById(bookingId)
    if (!booking) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Booking không tồn tại')
    }
    const tourDetails = await tourModel.findOneById(booking.tourId)
    // Lấy paymentMethod từ checkout nếu cần
    let paymentMethod = null
    let checkoutId = null
    let paymentStatus = null
    try {
      const checkout = await checkoutModel.findOneByBookingId
        ? await checkoutModel.findOneByBookingId(booking._id.toString())
        : await GET_DB().collection('checkouts').findOne({ bookingId: booking._id.toString() })
      paymentMethod = checkout?.paymentMethod || null
      checkoutId = checkout?._id || null
      paymentStatus = checkout?.paymentStatus || null
    } catch (error) {
      // Bỏ qua lỗi checkout
    }
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
        paymentMethod,
        checkoutId,
        paymentStatus
      },
      tourDetails: tourDetails || { message: 'Tour không còn tồn tại' }
    }
  } catch (error) {
    throw error
  }
}


export const bookingService = {
  createBooking,
  checkBooking,
  getAllToursBooking,
  getUserTours,
  updateBookingStatus,
  updateCheckoutPaymentStatus,
  getTourByBookingId
}
