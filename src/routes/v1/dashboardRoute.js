import express from 'express'
import { dashboardController } from '~/controllers/dashboardController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Get all dashboard data in one request
Router.get('/', authMiddleware.isAuthorized, dashboardController.getAll)

// Individual endpoints for each dashboard component
Router.get('/summary', authMiddleware.isAuthorized, dashboardController.getSummary)
Router.get('/domain_values', authMiddleware.isAuthorized, dashboardController.getValueDomain)
Router.get('/payment-status', authMiddleware.isAuthorized, dashboardController.getPaymentStatus)
Router.get('/most-booked', authMiddleware.isAuthorized, dashboardController.getMostTourBooked)
Router.get('/new-bookings', authMiddleware.isAuthorized, dashboardController.getNewBooking)
Router.get('/revenue', authMiddleware.isAuthorized, dashboardController.getRevenuePerMonth)

export const dashboardRoute = Router
