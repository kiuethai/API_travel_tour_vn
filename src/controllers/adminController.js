import { StatusCodes } from 'http-status-codes'
import { adminService } from '~/services/adminService'
import ms from 'ms'
import ApiError from '~/utils/ApiError'

const createNew = async (req, res, next) => {
  try {
    const createdAdmin = await adminService.createNew(req.body)
    res.status(StatusCodes.CREATED).json(createdAdmin)
  } catch (error) { next(error) }
}

const verifyAccount = async (req, res, next) => {
  try {
    const result = await adminService.verifyAccount(req.body)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

const login = async (req, res, next) => {
  try {
    const result = await adminService.login(req.body)

    // Set cookies for tokens
    res.cookie('adminAccessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    res.cookie('adminRefreshToken', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

const logout = async (req, res, next) => {
  try {
    // Clear admin cookies
    res.clearCookie('adminAccessToken')
    res.clearCookie('adminRefreshToken')

    res.status(StatusCodes.OK).json({ loggedOut: true })
  } catch (error) { next(error) }
}

const refreshToken = async (req, res, next) => {
  try {
    const result = await adminService.refreshToken(req.cookies?.adminRefreshToken)

    // Set new access token cookie
    res.cookie('adminAccessToken', result.accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Please Sign In as Admin! (Error from refresh Token)'))
  }
}

const update = async (req, res, next) => {
  try {
    const adminId = req.jwtDecoded._id
    const adminAvatarFile = req.file

    const updatedAdmin = await adminService.update(adminId, req.body, adminAvatarFile)
    res.status(StatusCodes.OK).json(updatedAdmin)
  } catch (error) { next(error) }
}

export const adminController = {
  createNew,
  verifyAccount,
  login,
  logout,
  refreshToken,
  update
}
