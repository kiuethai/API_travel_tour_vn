/* eslint-disable no-useless-catch */
import { tourModel } from '~/models/tourModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'

const addTour = async (reqBody, tourImagesFiles) => {
  try {
    // Kiểm tra xem có đủ ít nhất 5 hình ảnh không
    if (!tourImagesFiles || tourImagesFiles.length < 5) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Cần ít nhất 5 hình ảnh cho tour')
    }

    // Đảm bảo itinerary luôn là array trước khi lưu DB
    let itinerary = reqBody.itinerary
    if (typeof itinerary === 'string') {
      try {
        itinerary = JSON.parse(itinerary)
        if (!Array.isArray(itinerary)) itinerary = []
      } catch {
        itinerary = []
      }
    }
    if (!Array.isArray(itinerary)) itinerary = []

    // Tạo dữ liệu tour cơ bản
    const newTour = {
      title: reqBody.title,
      description: reqBody.description,
      images: [], // Sẽ được cập nhật với URL của hình ảnh tải lên
      quantity: parseInt(reqBody.quantity),
      domain: reqBody.domain,
      priceAdult: parseFloat(reqBody.priceAdult),
      priceChild: parseFloat(reqBody.priceChild),
      destination: reqBody.destination,
      availability: reqBody.availability !== undefined ? reqBody.availability : false, // Default to false
      itinerary, // always array
      startDate: reqBody.startDate, // Now handled by the model
      endDate: reqBody.endDate // Now handled by the model
    }

    // Upload hình ảnh lên Cloudinary
    const uploadPromises = tourImagesFiles.map(file =>
      CloudinaryProvider.streamUpload(file.buffer, 'tours')
    )

    const uploadedImages = await Promise.all(uploadPromises)
    newTour.images = uploadedImages.map(img => img.secure_url)

    // Lưu tour vào database
    const createdTour = await tourModel.createNew(newTour)
    const tourDetails = await tourModel.findOneById(createdTour.insertedId)

    return tourDetails
  } catch (error) { throw error }
}

const getAllTours = async () => {
  try {
    const tours = await tourModel.findAll()
    return tours
  } catch (error) { throw error }
}

const getTourById = async (tourId) => {
  try {
    const tour = await tourModel.findOneById(tourId)
    if (!tour) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tour không tồn tại')
    }
    return tour
  } catch (error) { throw error }
}

const updateTour = async (tourId, updateData) => {
  try {
    // Kiểm tra xem tour có tồn tại không
    const existingTour = await tourModel.findOneById(tourId)
    if (!existingTour) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tour không tồn tại')
    }

    const now = new Date()
    const startDate = new Date(existingTour.startDate)
    const endDate = new Date(existingTour.endDate)

    // Nếu tour đã kết thúc
    if (now > endDate) {
      // Cập nhật trạng thái availability = false nếu chưa cập nhật
      if (existingTour.availability !== false) {
        await tourModel.update(tourId, { availability: false })
      }
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Tour đã hoàn thành, không thể cập nhật')
    }

    // Nếu tour đang diễn ra
    if (now >= startDate && now <= endDate) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Không thể cập nhật vì tour đang diễn ra')
    }

    // Cập nhật tour
    const updatedTour = await tourModel.update(tourId, updateData)
    return updatedTour
  } catch (error) { throw error }
}

const addItinerary = async (tourId, itineraries) => {
  try {
    // Kiểm tra xem tour có tồn tại không
    const existingTour = await tourModel.findOneById(tourId)
    if (!existingTour) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Tour không tồn tại')
    }

    // Cập nhật itinerary và đặt availability thành true
    const updatedTour = await tourModel.updateItinerary(tourId, itineraries)
    return updatedTour
  } catch (error) { throw error }
}

export const tourService = {
  addTour,
  getAllTours,
  getTourById,
  updateTour,
  addItinerary
}
