import Joi from 'joi'
import { ObjectId } from 'mongodb'
import { GET_DB } from '~/config/mongodb'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { calculateTourDuration } from '~/utils/dateUtils'

// Define Collection (name & schema)
const TOUR_COLLECTION_NAME = 'tours'
const TOUR_COLLECTION_SCHEMA = Joi.object({
  title: Joi.string().required().trim().strict(),
  description: Joi.string().required().trim(),
  images: Joi.array().items(
    Joi.string().trim()
  ).default([]).messages({
    'array.base': 'Hình ảnh phải là một mảng các đường dẫn ảnh'
  }),
  quantity: Joi.number().integer().min(0).required(),
  domain: Joi.string().required().trim(),
  priceAdult: Joi.number().min(0).required(),
  priceChild: Joi.number().min(0).required(),
  destination: Joi.string().required().trim(),
  availability: Joi.boolean().default(false),
  itinerary: Joi.array().items(Joi.object({
    day: Joi.number().required(),
    title: Joi.string().required(),
    description: Joi.string().allow('').default('')
  })).default([]),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  time: Joi.string().required(), // Format: "X ngày Y đêm"
  reviews: Joi.array().items(Joi.object({
    userId: Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    userName: Joi.string().required(),
    avatar: Joi.string().allow(null).default(null),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().allow('').default(''),
    createdAt: Joi.date().timestamp('javascript').default(Date.now)
  })).default([]),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(null),
  _destroy: Joi.boolean().default(false)
})

// Chỉ định ra những Fields mà không cho phép cập nhật trong hàm update()
const INVALID_UPDATE_FIELDS = ['_id', 'createdAt']

const validateBeforeCreate = async (data) => {
  return await TOUR_COLLECTION_SCHEMA.validateAsync(data, { abortEarly: false })
}

// Hàm phụ trợ để phân tích các định dạng ngày khác nhau
const parseDate = (dateString) => {
  if (dateString instanceof Date) return dateString

  // Thử các định dạng ngày khác nhau
  let date = null

  // Định dạng: DD/MM/YY hoặc YY/MM/DD
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateString)) {
    // Thử định dạng DD/MM/YY trước
    const [day, month, year] = dateString.split('/').map(Number)
    date = new Date(2000 + year, month - 1, day)

    // Nếu ngày không hợp lệ, thử định dạng YY/MM/DD
    if (isNaN(date.getTime())) {
      const [year, month, day] = dateString.split('/').map(Number)
      date = new Date(2000 + year, month - 1, day)
    }
  }
  // Định dạng: DD/MM/YYYY
  else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [day, month, year] = dateString.split('/').map(Number)
    date = new Date(year, month - 1, day)
  }
  // Định dạng ISO chuẩn hoặc các định dạng khác
  else {
    date = new Date(dateString)
  }

  // Kiểm tra tính hợp lệ của ngày
  if (isNaN(date.getTime())) {
    throw new Error(`Định dạng ngày không hợp lệ: ${dateString}`)
  }

  return date
}

const createNew = async (data) => {
  try {
    // Xử lý ngày
    const startDate = parseDate(data.startDate)
    const endDate = parseDate(data.endDate)

    // Tính thời gian tour
    const tourTime = calculateTourDuration(startDate, endDate)

    // Tạo lịch trình trống dựa trên khoảng thời gian
    let itinerary = data.itinerary || []
    if (!itinerary.length) {
      const days = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24))
      itinerary = Array.from({ length: days }, (_, i) => ({
        day: i + 1,
        title: `Ngày ${i + 1}`,
        description: ''
      }))
    }

    // Chuẩn bị dữ liệu tour
    const tourData = {
      ...data,
      startDate,
      endDate,
      time: tourTime,
      itinerary,
      images: data.images || []
    }

    const validData = await validateBeforeCreate(tourData)
    const createdTour = await GET_DB().collection(TOUR_COLLECTION_NAME).insertOne(validData)
    return createdTour
  } catch (error) { throw new Error(error) }
}

const findOneById = async (tourId) => {
  try {
    const result = await GET_DB().collection(TOUR_COLLECTION_NAME).findOne({
      _id: new ObjectId(tourId),
      _destroy: false
    })
    return result
  } catch (error) { throw new Error(error) }
}

const findAll = async () => {
  try {
    const result = await GET_DB().collection(TOUR_COLLECTION_NAME)
      .find({ _destroy: false })
      .sort({ createdAt: -1 })
      .toArray()
    return result
  } catch (error) { throw new Error(error) }
}

const update = async (tourId, updateData) => {
  try {
    // Lọc những field không cho phép cập nhật
    Object.keys(updateData).forEach(fieldName => {
      if (INVALID_UPDATE_FIELDS.includes(fieldName)) {
        delete updateData[fieldName]
      }
    })

    // Xử lý ngày tháng
    if (updateData.startDate) {
      updateData.startDate = parseDate(updateData.startDate)
    }
    if (updateData.endDate) {
      updateData.endDate = parseDate(updateData.endDate)
    }

    // Nếu có cập nhật ngày, tính lại thời gian tour
    if (updateData.startDate && updateData.endDate) {
      updateData.time = calculateTourDuration(updateData.startDate, updateData.endDate)
    } else if (updateData.startDate || updateData.endDate) {
      const existingTour = await findOneById(tourId)
      const startDate = updateData.startDate || existingTour.startDate
      const endDate = updateData.endDate || existingTour.endDate
      updateData.time = calculateTourDuration(startDate, endDate)
    }

    // Cập nhật updatedAt
    updateData.updatedAt = Date.now()

    const result = await GET_DB().collection(TOUR_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(tourId) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) { throw new Error(error) }
}

// Cập nhật lịch trình tour
const updateItinerary = async (tourId, itineraries) => {
  try {
    // Định dạng dữ liệu lịch trình
    const formattedItineraries = itineraries.map((item, index) => ({
      day: index + 1,
      title: item.title,
      description: item.description
    }))

    // Cập nhật tour và đặt availability thành true
    const result = await GET_DB().collection(TOUR_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(tourId) },
      {
        $set: {
          itinerary: formattedItineraries,
          availability: true,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) { throw new Error(error) }
}

// Cập nhật hình ảnh tour
const updateImages = async (tourId, imageUrls) => {
  try {
    // Kiểm tra mảng hình ảnh
    if (!Array.isArray(imageUrls)) {
      throw new Error('Hình ảnh phải là một mảng')
    }

    // Cập nhật hình ảnh cho tour
    const result = await GET_DB().collection(TOUR_COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(tourId) },
      {
        $set: {
          images: imageUrls,
          updatedAt: Date.now()
        }
      },
      { returnDocument: 'after' }
    )

    return result
  } catch (error) { throw new Error(error) }
}

export const tourModel = {
  TOUR_COLLECTION_NAME,
  TOUR_COLLECTION_SCHEMA,
  createNew,
  findOneById,
  findAll,
  update,
  updateItinerary,
  updateImages
}
