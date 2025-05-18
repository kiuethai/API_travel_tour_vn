import { StatusCodes } from 'http-status-codes'
import { tourService } from '~/services/tourService'
import { reviewService } from '~/services/reviewService'
import { recommendService } from '~/services/recommendService'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'

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

const getAllTours = async (req, res) => {
  try {
    const tours = await tourService.getAllTours()

    const toursWithRatings = await Promise.all(
      tours.map(async tour => {

        const tourId = tour._id.toString()
        const reviews = await reviewService.getReviewByTourId(tourId)
        const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0)
        const reviewCount = reviews.length
        const averageRating = reviewCount > 0 ? Number((totalRating / reviewCount).toFixed(1)) : 0
        return {
          ...tour,
          averageRating,
          reviewCount: reviews.length
        }
      })
    )
    return res.status(StatusCodes.OK).json(toursWithRatings)
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ errors: error.message })
  }
}

const getTourById = async (req, res, next) => {
  try {
    const tourId = req.params.id
    const tour = await tourService.getTourById(tourId)

    if (!tour) {
      return res.status(StatusCodes.NOT_FOUND).json({ errors: 'Tour không tồn tại' })
    }

    const reviews = await reviewService.getReviewByTourId(req.params.id)
    const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0)

    const tourWithRating = {
      ...tour,
      totalRating,
      reviewCount: reviews.length
    }
    return res.status(StatusCodes.OK).json(tourWithRating)
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

// Recommend tours based on user context
const recommendTours = async (req, res, next) => {
  try {
    // Try to decode token from cookies to get userId
    const token = req.cookies?.accessToken || req.cookies?.adminAccessToken
    let userId

    if (token) {
      try {
        const decoded = await JwtProvider.verifyToken(token, env.ACCESS_TOKEN_SECRET_SIGNATURE)
        userId = decoded._id
      } catch {
        userId = null
      }
    }
    const { clickedTourId, search } = req.query
    const recommendations = await recommendService.getRecommendations({ userId, clickedTourId, searchQuery: search })


    const recommendationsfull = await Promise.all(
      recommendations.map(async rec => {
        const recId = rec._id.toString()
        const reviews = await reviewService.getReviewByTourId(recId)
        const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0)
        const reviewCount = reviews.length
        const averageRating = reviewCount > 0
          ? Number((totalRating / reviewCount).toFixed(1))
          : 0
        return {
          ...rec,
          averageRating,
          reviewCount
        }
      }
      ))

    return res.status(StatusCodes.OK).json({
      success: true,
      recommendations: recommendationsfull
    })
  } catch (error) {
    next(error)
  }
}

export const tourController = {
  addTour,
  getAllTours,
  getTourById,
  updateTour,
  addItinerary,
  recommendTours
}
