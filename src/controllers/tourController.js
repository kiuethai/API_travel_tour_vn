import { StatusCodes } from 'http-status-codes'
import { tourService } from '~/services/tourService'

const addTour = async (req, res, next) => {
  try {
    // Get image files from the request
    const tourImagesFiles = req.files

    // Create tour with data from request body and uploaded files
    const createdTour = await tourService.addTour(req.body, tourImagesFiles)

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Tour added successfully!',
      tourId: createdTour._id,
      tour: createdTour
    })
  } catch (error) { next(error) }
}

const getAllTours = async (req, res, next) => {
  try {
    const tours = await tourService.getAllTours()
    res.status(StatusCodes.OK).json(tours)
  } catch (error) { next(error) }
}

const getTourById = async (req, res, next) => {
  try {
    const tourId = req.params.id
    const tour = await tourService.getTourById(tourId)

    res.status(StatusCodes.OK).json({
      success: true,
      tour: tour
    })
  } catch (error) { next(error) }
}

const updateTour = async (req, res, next) => {
  try {
    const tourId = req.params.id
    const updatedTour = await tourService.updateTour(tourId, req.body)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Tour updated successfully!',
      tour: updatedTour
    })
  } catch (error) { next(error) }
}

const addItinerary = async (req, res, next) => {
  try {
    const tourId = req.params.id
    const itineraries = req.body.itineraries

    const updatedTour = await tourService.addItinerary(tourId, itineraries)

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Itinerary added successfully!',
      tour: updatedTour
    })
  } catch (error) { next(error) }
}

export const tourController = {
  addTour,
  getAllTours,
  getTourById,
  updateTour,
  addItinerary
}
