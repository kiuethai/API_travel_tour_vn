import { StatusCodes } from 'http-status-codes'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'
import ApiError from '~/utils/ApiError'


const isAuthorized = async (req, res, next) => {
  // Lấu accessToken nằm trong request cookies phía client - withCredentials trong file authorizeAxios
  // Try to get token from cookies or Authorization header
  const clientAccessToken = req.cookies?.accessToken
  const adminAccessToken = req.cookies?.adminAccessToken
  let token = adminAccessToken || clientAccessToken
  // Fallback to Authorization header Bearer token
  if (!token) {
    const authHeader = req.headers.authorization || req.headers.Authorization
    if (authHeader) {
      token = authHeader.startsWith('Bearer ')
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
    // Verify and decode the access token
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
    // console.log('🚀 ~ isAuthorized ~ error:', error)
    // Nếu cái accessToken nó bị hết hạn (expired) thì mình cần trả về một cái mã lỗi GONE- 410  cho phía FE biết để gọi api refreshToken
    if (error?.message?.includes('jwt expired')) {
      next(new ApiError(StatusCodes.GONE, 'Need to refresh token'))
      return
    }
    // Nếu như cái accessToken nó không hợp lệ do bất kỳ điều gì khác vụ hết hạn thì chúng ta cứ thẳng trả về mã 401 cho phía FE gọi api sign_out luôn
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized!'))


  }
}

export const authMiddleware = { isAuthorized }