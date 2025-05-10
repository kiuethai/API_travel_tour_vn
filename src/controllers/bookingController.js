import { StatusCodes } from 'http-status-codes'
import { bookingService } from '~/services/bookingService'
import { checkoutService } from '~/services/checkoutService'
import { tourService } from '~/services/tourService'
import { env } from '~/config/environment'
import { ObjectId } from 'mongodb/lib/bson'
import axios from 'axios'
import { BrevoProvider } from '~/providers/BrevoProvider'

// Hàm chuyển đổi phương thức thanh toán sang tên hiển thị và logo
function renderPaymentMethod(method) {
  switch (method) {
    case 'momo-payment':
      return '<img src="https://static.mservice.io/img/logo-momo.png" alt="Momo" width="20" style="vertical-align:middle;margin-right:6px;"> Momo'
    case 'paypal-payment':
      return '<img src="https://www.paypalobjects.com/webstatic/icon/pp258.png" alt="PayPal" width="20" style="vertical-align:middle;margin-right:6px;"> PayPal'
    case 'office-payment':
      return '<img src="https://cdn-icons-png.flaticon.com/512/1250/1250615.png" alt="Thanh toán tại quầy" width="20" style="vertical-align:middle;margin-right:6px;"> Thanh toán tại quầy'
    default:
      return method || ''
  }
}

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

// PUT /booking/updateBooking/:id
const updateBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.id
    const { status } = req.body

    // Chỉ cho phép cập nhật sang confirmed hoặc completed
    if (!['confirmed', 'completed'].includes(status)) {
      return res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: 'Trạng thái không hợp lệ' })
    }

    // Cập nhật trạng thái booking
    const updatedBooking = await bookingService.updateBookingStatus(bookingId, status)

    // Nếu xác nhận thì cập nhật paymentStatus checkout thành 'y'
    if (status === 'confirmed') {
      await bookingService.updateCheckoutPaymentStatus(bookingId, 'y')
    }

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Cập nhật booking thành công',
      booking: updatedBooking
    })
  } catch (error) {
    next(error)
  }
}

const getTourByBookingId = async (req, res, next) => {
  try {
    const { bookingId } = req.params

    // Validate bookingId là MongoDB ObjectId hợp lệ
    if (!ObjectId.isValid(bookingId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Booking ID không hợp lệ'
      })
    }

    // Lấy thông tin tour dựa vào bookingId
    const tour = await bookingService.getTourByBookingId(bookingId)

    return res.status(StatusCodes.OK).json({
      success: true,
      tour
    })
  } catch (error) {
    next(error)
  }
}




const sendInvoiceByBookingId = async (req, res, next) => {
  try {
    const { bookingId } = req.params

    // Validate bookingId
    if (!ObjectId.isValid(bookingId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Booking ID không hợp lệ'
      })
    }

    // Lấy thông tin booking, tour, checkout
    const bookingData = await bookingService.getTourByBookingId(bookingId)
    if (!bookingData || !bookingData.bookingInfo || !bookingData.tourDetails) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy thông tin hóa đơn'
      })
    }
    const { bookingInfo, tourDetails } = bookingData

    // Tính toán chi tiết giá
    const priceAdult = tourDetails.priceAdult || 0
    const priceChild = tourDetails.priceChild || 0
    const numAdults = bookingInfo.adults || 0
    const numChildren = bookingInfo.children || 0
    const totalAdult = priceAdult * numAdults
    const totalChild = priceChild * numChildren
    const totalPrice = bookingInfo.totalPrice || 0


    // Render HTML hóa đơn
    const invoiceHtml = `
      <div style="max-width:600px;margin:auto;border:1px solid #eee;border-radius:8px;font-family:Arial,sans-serif;background:#fff;">
        <div style="background:#1976d2;color:#fff;padding:24px 16px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;">HÓA ĐƠN ĐẶT TOUR DU LỊCH</h2>
          <p style="margin:0;font-size:15px;">Mã hóa đơn: <b>${bookingInfo.bookingId}</b></p>
        </div>
        <div style="padding:24px;">
          <h3 style="margin-top:0;">Thông tin khách hàng</h3>
          <table style="width:100%;font-size:15px;">
            <tr><td><b>Họ tên:</b></td><td>${bookingInfo.fullName}</td></tr>
            <tr><td><b>Email:</b></td><td>${bookingInfo.email}</td></tr>
            <tr><td><b>Số điện thoại:</b></td><td>${bookingInfo.phoneNumber || ''}</td></tr>
            <tr><td><b>Địa chỉ:</b></td><td>${bookingInfo.address || ''}</td></tr>
          </table>
          <hr style="margin:24px 0;">
          <h3>Thông tin tour</h3>
          <table style="width:100%;font-size:15px;">
            <tr><td><b>Tên tour:</b></td><td>${tourDetails.title || ''}</td></tr>
            <tr><td><b>Điểm đến:</b></td><td>${tourDetails.destination || ''}</td></tr>
            <tr><td><b>Ngày khởi hành:</b></td><td>${tourDetails.startDate ? new Date(tourDetails.startDate).toLocaleDateString('vi-VN') : ''}</td></tr>
            <tr><td><b>Số người lớn:</b></td><td>${numAdults}</td></tr>
            <tr><td><b>Số trẻ em:</b></td><td>${numChildren}</td></tr>
            <tr><td><b>Phương thức thanh toán:</b></td><td>${renderPaymentMethod(bookingInfo.paymentMethod)}</td></tr>
            <tr><td><b>Trạng thái thanh toán:</b></td><td>${bookingInfo.paymentStatus === 'y' ? 'Đã thanh toán' : 'Chưa thanh toán'}</td></tr>
          </table>
          <hr style="margin:24px 0;">
          <h3>Chi tiết thanh toán</h3>
          <table style="width:100%;font-size:15px;">
            <tr><td>Tiền người lớn:</td><td align="right">${priceAdult} x ${numAdults} = <b>${totalAdult} vnđ</b></td></tr>
            <tr><td>Tiền trẻ em:</td><td align="right">${priceChild} x ${numChildren} = <b>${totalChild} vnđ</b></td></tr>
            <tr><td><b>Tổng cộng:</b></td><td align="right"><b style="color:#1976d2;font-size:18px;">${totalPrice} vnđ</b></td></tr>
          </table>
          <p style="margin-top:32px;font-size:14px;color:#888;">Cảm ơn bạn đã đặt tour tại KTTravel!
          </p>
          
        </div>
      </div>
    `

    // Gửi email hóa đơn
    await BrevoProvider.sendEmail(
      bookingInfo.email,
      'Hóa đơn đặt tour tại KTTravel',
      invoiceHtml
    )

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Đã gửi hóa đơn thành công!'
    })
  } catch (error) {
    next(error)
  }
}

export const bookingController = {
  createBooking,
  checkBooking,
  paypalBooking,
  getAllToursBooking,
  getTourByUserId,
  momoBooking,
  updateBooking,
  getTourByBookingId,
  sendInvoiceByBookingId
}