import { StatusCodes } from 'http-status-codes'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'
import ApiError from '~/utils/ApiError'


const isAuthorized = async (req, res, next) => {
  // Đơn giản hóa: dùng chung một tên token
  let token = req.cookies?.accessToken
  // console.log('🚀 ~ isAuthorized ~ token:', token)

  // Fallback to Authorization header Bearer token
  if (!token) {
    const authHeader = req.headers.authorization || req.headers.Authorization
    if (authHeader) {
      token = authHeader.startsWith('Bearer')
        ? authHeader.slice(7)
        : authHeader
    }
  }

  // No token found
  if (!token) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized! (token not found)'))
    return
  }

  try {
    // Bước 1: Thực hiện giải mã token xem nó có hợp lệ hay là không
    const decoded = await JwtProvider.verifyToken(token, env.ACCESS_TOKEN_SECRET_SIGNATURE)
    // Normalize user data for downstream
    const userId = decoded.id || decoded._id
    const userRole = decoded.role
    const userEmail = decoded.email
    req.jwtDecoded = { id: userId, role: userRole, email: userEmail }
    req.user = { id: userId, role: userRole, email: userEmail }

    // Bước 3: Cho phép cái request đi tiếp
    next()
  } catch (error) {
    // Nếu cái accessToken bị hết hạn (expired)
    if (error?.message?.includes('jwt expired')) {
      next(new ApiError(StatusCodes.GONE, 'Need to refresh token'))
      return
    }
    // Nếu accessToken không hợp lệ
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized!'))
  }
}

export const authMiddleware = { isAuthorized }