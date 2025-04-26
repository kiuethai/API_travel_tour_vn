/* eslint-disable no-useless-catch */
import { bookingModel } from '~/models/bookingModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'

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

export const bookingService = {
  createBooking,
  checkBooking
}
