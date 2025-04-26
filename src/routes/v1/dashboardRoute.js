import express from 'express'
import { dashboardController } from '~/controllers/dashboardController'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

// Comment out or remove the problematic route that uses getAll
// Router.get('/', authMiddleware.verifyAdminToken, dashboardController.getAll)

// Add route for getting user summary
Router.get('/summary', authMiddleware.isAuthorized, dashboardController.getSummary)

// Use the correct middleware - isAuthorized instead of verifyAdminToken
Router.get('/domain_values', dashboardController.getValueDomain)

// Keep other routes commented out until they are implemented
// Router.get('/payment-status', authMiddleware.isAuthorized, dashboardController.getPaymentStatus)
// Router.get('/most-booked', authMiddleware.isAuthorized, dashboardController.getMostTourBooked)
// Router.get('/new-bookings', authMiddleware.isAuthorized, dashboardController.getNewBooking)
// Router.get('/revenue', authMiddleware.isAuthorized, dashboardController.getRevenuePerMonth)

export const dashboardRoute = Router
