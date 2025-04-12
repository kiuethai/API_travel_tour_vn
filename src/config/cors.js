
import { WHITELIST_DOMAINS } from '~/utils/constants'
import { env } from '~/config/environment'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'

export const corsOptions = {
  origin: function (origin, callback) {
    // Các trường hợp được phép
    const allowedOrigins = [
      ...WHITELIST_DOMAINS,
      'http://localhost'
    ]

    // Kiểm tra origin
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    // Kiểm tra domain con hoặc domain gốc
    const isAllowedDomain = allowedOrigins.some(allowedOrigin => {
      try {
        // So sánh hostname
        return new URL(allowedOrigin).hostname === new URL(origin).hostname
      } catch {
        return false
      }
    })

    if (isAllowedDomain) {
      return callback(null, true)
    }

    // Nếu không được phép
    return callback(new ApiError(
      StatusCodes.FORBIDDEN, 
      `${origin} not allowed by our CORS Policy.`
    ))
  },
  optionsSuccessStatus: 200,
  credentials: true
}