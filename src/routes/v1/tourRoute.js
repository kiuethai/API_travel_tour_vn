import express from 'express'
import { tourValidation } from '~/validations/tourValidation'
import { tourController } from '~/controllers/tourController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

// Get all tours - public access
Router.route('/getAllTours')
  .get(tourController.getAllTours)

// Recommend tours route - public access
Router.route('/recommend')
  .get(tourController.recommendTours)

// Get tour by ID
Router.route('/:id')
  .get(tourController.getTourById)

// Add new tour - admin access required
Router.route('/addTour')
  .post(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.array('images', 10),
    tourValidation.createNew,
    tourController.addTour
  )

const multer = require('multer')
const upload = multer()

Router.route('/updateTour/:id')
  .put(
    authMiddleware.isAuthorized,
    upload.none(), // hoặc upload.single('images') nếu có file
    tourValidation.updateTour,
    tourController.updateTour
  )

// Add itinerary to tour
Router.route('/:id/itinerary')
  .post(
    authMiddleware.isAuthorized,
    tourValidation.updateItinerary,
    tourController.addItinerary
  )

export const tourRoute = Router