import { StatusCodes } from 'http-status-codes'
import { bookingService } from '~/services/bookingService'
import { checkoutService } from '~/services/checkoutService'
import { tourService } from '~/services/tourService'
import { env } from '~/config/environment'
import { ObjectId } from 'mongodb/lib/bson'
import axios from 'axios'

// POST /booking
const createBooking = async (req, res, next) => {
  try {
    const {
      address,
      email,
      fullName,
      numAdults,
      numChildren,
      payment_hidden: paymentMethod,
      tel,
      totalPrice,
      tourId,
      transactionIdPaypal,
      transactionIdMomo
    } = req.body

    // Lấy userId từ token đã giải mã
    const userId = req.jwtDecoded?._id || req.body.userId

    const dataBooking = {
      tourId,
      userId,
      address,
      fullName,
      email,
      numAdults: Number(numAdults),
      numChildren: Number(numChildren),
      phoneNumber: tel,
      totalPrice: Number(totalPrice)
    }
    const booking = await bookingService.createBooking(dataBooking)

    // 2. Tạo checkout
    const dataCheckout = {
      bookingId: booking._id.toString(),
      paymentMethod,
      amount: Number(totalPrice),
      paymentStatus: (paymentMethod === 'paypal-payment' || paymentMethod === 'momo-payment') ? 'y' : 'n'
    }
    if (paymentMethod === 'paypal-payment') {
      dataCheckout.transactionId = transactionIdPaypal
    } else if (paymentMethod === 'momo-payment') {
      dataCheckout.transactionId = transactionIdMomo
    }
    const checkout = await checkoutService.createCheckout(dataCheckout)

    if (!booking || !checkout) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Có vấn đề khi đặt tour!' })
    }

    // 3. Trừ số lượng tour
    const tour = await tourService.getTourById(tourId)
    const newQuantity = tour.quantity - (Number(numAdults) + Number(numChildren))
    await tourService.updateTour(tourId, { quantity: newQuantity })

    // 4. Trả về kết quả
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Đặt tour thành công!',
      bookingId: booking._id,
      checkoutId: checkout._id
    })
  } catch (error) {
    next(error)
  }
}

// POST /booking/check
const checkBooking = async (req, res, next) => {
  try {
    const { tourId } = req.body
    const userId = req.jwtDecoded?._id
    const hasBooking = await bookingService.checkBooking(tourId, userId)
    if (!hasBooking) {
      return res.status(StatusCodes.OK).json({ success: false })
    }
    return res.status(StatusCodes.OK).json({ success: true })
  } catch (error) {
    next(error)
  }
}

const paypalBooking = async (req, res) => {
  return res.status(StatusCodes.OK).json({
    success: true,
    data_paypal: env.PAYPAL_CLIENT_ID
  })
}

// GET /booking/getAllTour
const getAllToursBooking = async (req, res, next) => {
  try {
    // Sử dụng tourService có sẵn để lấy tất cả tour
    const tours = await bookingService.getAllToursBooking()
    return res.status(StatusCodes.OK).json({
      success: true,
      tours: tours
    })
  } catch (error) {
    next(error)
  }
}

// GET /booking/getUserTours/:userId
const getTourByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params

    // Validate userId là MongoDB ObjectId hợp lệ
    if (!ObjectId.isValid(userId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'User ID không hợp lệ'
      })
    }

    // Lấy danh sách tour mà người dùng đã đặt
    const userTours = await bookingService.getUserTours(userId)

    return res.status(StatusCodes.OK).json({
      success: true,
      tours: userTours
    })
  } catch (error) {
    next(error)
  }
}

export const momoBooking = async (req, res) => {
  try {
    // Lấy thông tin từ FE
    const { amount, orderInfo, redirectUrl } = req.body

    // Validate các trường bắt buộc
    if (!amount || !orderInfo || !redirectUrl) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Thiếu thông tin thanh toán MoMo!' })
    }

    const partnerCode = 'MOMO'
    const accessKey = 'F8BBA842ECF85'
    const secretkey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz'
    const requestId = partnerCode + new Date().getTime()
    const orderId = requestId
    const ipnUrl = 'http://localhost:8018/api/check-payment'
    const requestType = 'captureWallet'
    const extraData = ''

    // Tạo rawSignature
    const rawSignature =
      'accessKey=' + accessKey +
      '&amount=' + amount +
      '&extraData=' + extraData +
      '&ipnUrl=' + ipnUrl +
      '&orderId=' + orderId +
      '&orderInfo=' + orderInfo +
      '&partnerCode=' + partnerCode +
      '&redirectUrl=' + redirectUrl +
      '&requestId=' + requestId +
      '&requestType=' + requestType
    // console.log('rawSignature:', rawSignature)
    // Tạo signature
    const crypto = require('crypto')
    const signature = crypto.createHmac('sha256', secretkey)
      .update(rawSignature)
      .digest('hex')

    // Tạo request body
    const requestBody = {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi'
    }

    // Gửi request đến MoMo bằng axios
    const response = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', requestBody, {
      headers: { 'Content-Type': 'application/json' }
    })

    const data = response.data
    return res.status(StatusCodes.OK).json(data)
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Thanh toán MoMo thất bại', error: error.message })
  }
}

export const bookingController = {
  createBooking,
  checkBooking,
  paypalBooking,
  getAllToursBooking,
  getTourByUserId,
  momoBooking
}