/* eslint-disable no-useless-catch */
import { checkoutModel } from '~/models/checkoutModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { ObjectId } from 'mongodb'

const createCheckout = async (checkoutData) => {
  try {
    // Validate booking ID
    if (!ObjectId.isValid(checkoutData.bookingId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Booking ID không hợp lệ')
    }

    // Create the checkout
    const checkout = await checkoutModel.createNew(checkoutData)
    if (!checkout) {
      throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Không thể tạo checkout')
    }

    return checkout
  } catch (error) { throw error }
}

export const checkoutService = {
  createCheckout
}
