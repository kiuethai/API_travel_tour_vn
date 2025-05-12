import { StatusCodes } from 'http-status-codes'
import { dashboardModel } from '~/models/dashboardModel'

const getAll = async (req, res) => {
  try {
    const summary = await dashboardModel.getSummary()
    const valueTour = await dashboardModel.getValueDomain()
    const dataDomain = {
      values: [
        valueTour.b || 0,
        valueTour.t || 0,
        valueTour.n || 0,
      ]
    }

    const paymentData = await dashboardModel.getValuePayment()
    const paymentMethodsData = {
      labels: ['PayPal', 'Momo', 'Office'],
      counts: [
        paymentData.paypal.count || 0,
        paymentData.momo.count || 0,
        paymentData.office.count || 0
      ],
      revenue: [
        paymentData.paypal.revenue || 0,
        paymentData.momo.revenue || 0,
        paymentData.office.revenue || 0
      ],
      totalRevenue: paymentData.totalRevenue || 0
    }

    const toursBooked = await dashboardModel.getMostTourBooked()
    const newBooking = await dashboardModel.getNewBooking()
    const revenue = await dashboardModel.getRevenuePerMonth()

    return res.status(StatusCodes.OK).json({
      summary,
      dataDomain,
      paymentMethods: paymentMethodsData,
      toursBooked,
      newBooking,
      revenue
    })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errors: error.message
    })
  }
}

const getSummary = async (req, res) => {
  try {
    const summary = await dashboardModel.getSummary()
    return res.status(StatusCodes.OK).json({ summary })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errors: error.message
    })
  }
}

const getValueDomain = async (req, res) => {
  try {
    const valueTour = await dashboardModel.getValueDomain()
    const dataDomain = {
      values: [
        valueTour.b || 0,
        valueTour.t || 0,
        valueTour.n || 0,
      ]
    }
    return res.status(StatusCodes.OK).json({ dataDomain })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errors: error.message
    })
  }
}

const getPaymentStatus = async (req, res) => {
  try {
    const paymentData = await dashboardModel.getValuePayment()

    return res.status(StatusCodes.OK).json({
      paymentMethods: {
        labels: ['PayPal', 'Momo', 'Office'],
        counts: [
          paymentData.paypal.count || 0,
          paymentData.momo.count || 0,
          paymentData.office.count || 0
        ],
        revenue: [
          paymentData.paypal.revenue || 0,
          paymentData.momo.revenue || 0,
          paymentData.office.revenue || 0
        ],
        totalRevenue: paymentData.totalRevenue || 0
      }
    })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errors: error.message
    })
  }
}

const getMostTourBooked = async (req, res) => {
  try {
    const toursBooked = await dashboardModel.getMostTourBooked()
    return res.status(StatusCodes.OK).json({ toursBooked })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errors: error.message
    })
  }
}

const getNewBooking = async (req, res) => {
  try {
    const newBooking = await dashboardModel.getNewBooking()
    return res.status(StatusCodes.OK).json({ newBooking })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errors: error.message
    })
  }
}

const getRevenuePerMonth = async (req, res) => {
  try {
    const revenue = await dashboardModel.getRevenuePerMonth()
    return res.status(StatusCodes.OK).json({ revenue })
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      errors: error.message
    })
  }
}

export const dashboardController = {
  getAll,
  getSummary,
  getValueDomain,
  getPaymentStatus,
  getMostTourBooked,
  getNewBooking,
  getRevenuePerMonth
}
