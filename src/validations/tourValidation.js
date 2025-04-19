import Joi from 'joi'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'
import { tourModel } from '~/models/tourModel'
import { ObjectId } from 'mongodb'
import { parseDate } from '~/utils/parseDate'

const createNew = async (req, res, next) => {
  const correctCondition = Joi.object({
    title: Joi.string().required().trim().max(255),
    description: Joi.string().required().trim(),
    quantity: Joi.number().integer().min(0).required().messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity must not be negative'
    }),
    domain: Joi.string().required().messages({
      'string.empty': 'Domain is required'
    }),
    priceAdult: Joi.number().min(0).required().messages({
      'number.base': 'Adult price must be a number',
      'number.min': 'Adult price must not be negative'
    }),
    priceChild: Joi.number().min(0).required().messages({
      'number.base': 'Child price must be a number',
      'number.min': 'Child price must not be negative'
    }),
    destination: Joi.string().required().messages({
      'string.empty': 'Destination is required'
    }),
    availability: Joi.boolean(),
    itinerary: Joi.alternatives().try(
      Joi.array().length(0),
      Joi.array().items(Joi.object({
        day: Joi.number().required(),
        title: Joi.string().required(),
        description: Joi.string().allow('').default('')
      }))
    ).default([]),
    startDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().custom((value, helpers) => {
        const date = parseDate(value)
        if (!date) return helpers.error('any.invalid')
        return date
      })
    ).required().messages({
      'any.required': 'Start date is required',
      'any.invalid': 'Start date must be a valid date format (DD/MM/YYYY, YY/MM/DD, etc.)'
    }),
    endDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().custom((value, helpers) => {
        const date = parseDate(value)
        if (!date) return helpers.error('any.invalid')
        return date
      })
    ).required().messages({
      'any.required': 'End date is required',
      'any.invalid': 'End date must be a valid date format (DD/MM/YYYY, YY/MM/DD, etc.)'
    })
  })

  try {
    // Đảm bảo itinerary luôn là một mảng
    if (req.body.itinerary === undefined) {
      req.body.itinerary = [];
    }
    else if (!Array.isArray(req.body.itinerary) && typeof req.body.itinerary !== 'string') {
      req.body.itinerary = [];
    }

    // Process itinerary from JSON string if needed
    if (req.body.itinerary && typeof req.body.itinerary === 'string') {
      try {
        req.body.itinerary = JSON.parse(req.body.itinerary);
        // Kiểm tra sau khi parse có phải là array không
        if (!Array.isArray(req.body.itinerary)) {
          req.body.itinerary = [];
        }
      } catch (error) {
        // Nếu parse lỗi, gán mảng rỗng thay vì ném lỗi
        req.body.itinerary = [];
      }
    }

    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}


const updateItinerary = async (req, res, next) => {
  req.body.tourId = req.params.id
  const correctCondition = Joi.object({
    tourId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    itineraries: Joi.array().items(Joi.object({
      day: Joi.number(), // Thêm trường day vào validation
      title: Joi.string().required(),
      description: Joi.string().allow('').default('')
    })),
    // Thêm trường itinerary để chấp nhận cả hai cách gửi dữ liệu
    itinerary: Joi.array().items(Joi.object({
      day: Joi.number(), // Thêm trường day vào validation
      title: Joi.string().required(),
      description: Joi.string().allow('').default('')
    }))
  })

  try {
    // Process data from request - extract itineraries from day-X and itinerary-X format
    if (!req.body.itineraries && req.body.itinerary) {
      req.body.itineraries = req.body.itinerary;
    }

    if (!req.body.itineraries) {
      const itineraries = []
      const requestData = req.body

      // Extract itineraries from day-X and itinerary-X format
      Object.keys(requestData).forEach(key => {
        const dayMatch = key.match(/^day-(\d+)$/)
        if (dayMatch) {
          const dayNumber = parseInt(dayMatch[1])
          const title = requestData[key]
          const itineraryKey = `itinerary-${dayNumber}`

          if (requestData[itineraryKey]) {
            itineraries.push({
              day: dayNumber, // Đảm bảo day được thêm vào
              title: title,
              description: requestData[itineraryKey]
            })
          }
        }
      })

      req.body.itineraries = itineraries
    }

    // Thêm trường day nếu chưa có
    if (req.body.itineraries && req.body.itineraries.length > 0) {
      req.body.itineraries = req.body.itineraries.map((item, index) => ({
        day: item.day || (index + 1),
        title: item.title,
        description: item.description || ''
      }))
    }

    // Kiểm tra định dạng tourId
    try {
      new ObjectId(req.body.tourId);
    } catch (error) {
      throw new Error('Tour ID không hợp lệ. Phải là một MongoDB ObjectId.');
    }

    await correctCondition.validateAsync(req.body, { abortEarly: false })
    const tourId = req.body.tourId

    const existingTour = await tourModel.findOneById(tourId)
    if (!existingTour) {
      throw new Error('Tour không tồn tại')
    }

    const startDate = new Date(existingTour.startDate)
    const endDate = new Date(existingTour.endDate)
    const tourDays = Math.ceil(Math.abs(endDate - startDate) / (1000 * 60 * 60 * 24)) + 1

    if (req.body.itineraries.length !== tourDays) {
      throw new Error(`Số ngày itinerary (${req.body.itineraries.length}) không khớp với số ngày của tour (${tourDays})`)
    }

    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}


const correctCondition = Joi.object({
  title: Joi.string(),
  description: Joi.string(),
  quantity: Joi.number().integer().min(0),
  domain: Joi.string(),
  priceAdult: Joi.number().min(0),
  priceChild: Joi.number().min(0),
  destination: Joi.string(),
  availability: Joi.boolean(),
  startDate: Joi.date(),
  endDate: Joi.date(),
  itinerary: Joi.array().items(
    Joi.object({
      day: Joi.number().integer().min(1),
      title: Joi.string(),
      description: Joi.string(),
    })
  ),
});

const updateTour = async (req, res, next) => {
  // Ép kiểu các trường số và boolean nếu là string (do FE gửi FormData)
  if (typeof req.body.quantity === 'string') req.body.quantity = Number(req.body.quantity);
  if (typeof req.body.priceAdult === 'string') req.body.priceAdult = Number(req.body.priceAdult);
  if (typeof req.body.priceChild === 'string') req.body.priceChild = Number(req.body.priceChild);
  if (typeof req.body.availability === 'string') {
    req.body.availability = req.body.availability === 'true' || req.body.availability === '1';
  }
  // Loại bỏ trường không mong muốn để tránh lỗi "is not allowed"
  delete req.body.existingImages;

  // console.log('REQ BODY:', req.body)
  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false });
    next();
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message));
  }
};


export const tourValidation = {
  createNew,
  updateItinerary,
  updateTour
}
