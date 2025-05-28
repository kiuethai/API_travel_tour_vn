import { StatusCodes } from 'http-status-codes'
import { mergedUserModel } from '~/models/mergedUserModel'
import ms from 'ms'
import ApiError from '~/utils/ApiError'
import bcrypt from 'bcryptjs'
import { JwtProvider } from '~/providers/JwtProvider'
import { env } from '~/config/environment'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'
import { BrevoProvider } from '~/providers/BrevoProvider'
import { v4 as uuidv4 } from 'uuid'
import { userService } from '~/services/userService'

/**
 * Create a new user (either regular user or admin based on role)
 */
const createNew = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const role = req.body.role || 'user'

    // Check if user already exists
    const existingUser = await mergedUserModel.findOneByEmail(email)
    if (existingUser) {
      throw new ApiError(StatusCodes.CONFLICT, 'Email already in use')
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Generate username and display name from email
    const emailPrefix = email.split('@')[0]
    const username = `${emailPrefix}_${Date.now()}`
    const displayName = emailPrefix

    // Generate verification token
    const verifyToken = uuidv4()

    // Create the user
    const newUser = await mergedUserModel.createNew({
      email,
      password: hashedPassword,
      username,
      displayName,
      role,
      verifyToken,
      isActive: false
    })

    // Send verification email
    const verificationLink = `${env.CLIENT_URL}/verify-account?email=${email}&token=${verifyToken}`

    try {
      await BrevoProvider.sendVerificationEmail(email, verificationLink)
    } catch (error) {
      console.error('Error sending verification email:', error)
    }

    // Remove sensitive data before sending response
    delete newUser.password
    delete newUser.verifyToken

    res.status(StatusCodes.CREATED).json({
      success: true,
      user: newUser
    })
  } catch (error) { next(error) }
}

/**
 * Verify a user's account
 */
const verifyAccount = async (req, res, next) => {
  try {
    const { email, token } = req.body

    // Find the user by email
    const user = await mergedUserModel.findOneByEmail(email)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }

    // Check if account is already verified
    if (user.isActive) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Account already verified')
    }

    // Verify token
    if (user.verifyToken !== token) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid verification token')
    }

    // Update user status
    const updatedUser = await mergedUserModel.update(user._id.toString(), {
      isActive: true,
      verifyToken: null
    })

    res.status(StatusCodes.OK).json({
      success: true,
      message: 'Account verified successfully'
    })
  } catch (error) { next(error) }
}

/**
 * Login regular user
 */
const loginUser = async (req, res, next) => {
  return _loginWithRole(req, res, next, 'user')
}

/**
 * Login admin
 */
const loginAdmin = async (req, res, next) => {
  return _loginWithRole(req, res, next, 'admin')
}

/**
 * Internal: chung logic, ép role
 */
const _loginWithRole = async (req, res, next, requiredRole) => {
  try {
    const { email, password } = req.body

    // Tìm user bằng email trước
    const user = await mergedUserModel.findOneByEmail(email)

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Thông tin xác thực không hợp lệ')
    }

    // Kiểm tra role - nếu không khớp với route, từ chối
    if (user.role !== requiredRole) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Bạn không có quyền truy cập vào hệ thống này')
    }

    // Kiểm tra trạng thái active
    if (!user.isActive) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Account not verified')
    }

    // Kiểm tra password
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Thông tin xác thực không hợp lệ')
    }

    // Generate tokens - đơn giản hóa với một loại token duy nhất
    const payload = { id: user._id.toString(), email: user.email, role: user.role }
    const accessToken = await JwtProvider.generateToken(
      payload,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_LIFE
    )
    const refreshToken = await JwtProvider.generateToken(
      payload,
      env.REFRESH_TOKEN_SECRET_SIGNATURE,
      env.REFRESH_TOKEN_LIFE
    )

    // Set cookies - không phân biệt admin hay user
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    // Prepare user data for response
    const userData = {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role
    }

    res.status(StatusCodes.OK).json({
      success: true,
      user: userData,
      accessToken,
      refreshToken
    })
  } catch (err) {
    next(err)
  }
}
/**
 * Logout for either users or admins
 */
const logout = async (req, res, next) => {
  try {
    // Đơn giản hóa - không cần phân biệt admin hay user
    res.clearCookie('accessToken')
    res.clearCookie('refreshToken')

    res.status(StatusCodes.OK).json({ success: true, loggedOut: true })
  } catch (error) { next(error) }
}

/**
 * Refresh token for either users or admins
 */
const refreshToken = async (req, res, next) => {
  try {
    // Đơn giản hóa - không phân biệt admin hay user
    const refreshToken = req.cookies?.refreshToken
    if (!refreshToken) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh token not found')
    }

    // Verify refresh token
    const decoded = await JwtProvider.verifyToken(refreshToken, env.REFRESH_TOKEN_SECRET_SIGNATURE)

    // Generate new access token
    const accessToken = await JwtProvider.generateToken(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_SECRET_EXPIRATION_TIME
    )

    // Set new access token cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: ms('14 days')
    })

    res.status(StatusCodes.OK).json({
      success: true,
      accessToken
    })
  } catch (error) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Please sign in again'))
  }
}
/**
 * Update user profile
 */
const update = async (req, res, next) => {
  try {
    const userId = req.jwtDecoded.id
    const userAvatarFile = req.file
    const updateData = { ...req.body }

    // If changing password
    if (updateData.current_password && updateData.new_password) {
      // Get current user data
      const currentUser = await mergedUserModel.findOneById(userId)

      // Verify current password
      const isPasswordValid = await bcrypt.compare(updateData.current_password, currentUser.password)
      if (!isPasswordValid) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Current password is incorrect')
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(updateData.new_password, salt)

      // Update the password field
      updateData.password = hashedPassword

      // Remove password fields from updateData
      delete updateData.current_password
      delete updateData.new_password
    }

    // Handle avatar upload if provided
    if (userAvatarFile) {
      const uploadResult = await CloudinaryProvider.uploadImage(userAvatarFile.path)
      if (uploadResult) {
        updateData.avatar = uploadResult.secure_url
      }
    }

    // Update timestamp
    updateData.updatedAt = Date.now()

    // Update user
    const updatedUser = await mergedUserModel.update(userId, updateData)

    // Remove sensitive data
    delete updatedUser.password
    delete updatedUser.verifyToken

    res.status(StatusCodes.OK).json({
      success: true,
      user: updatedUser
    })
  } catch (error) { next(error) }
}

/**
 * Update user by ID (admin function)
 */
const updateById = async (req, res, next) => {
  try {
    const userId = req.params.id
    const updateData = { ...req.body }

    // Check user exists
    const user = await mergedUserModel.findOneById(userId)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }

    // Ensure admin cannot change the role
    // delete updateData.role

    // Update timestamp
    updateData.updatedAt = Date.now()

    // Update user
    const updatedUser = await mergedUserModel.update(userId, updateData)

    // Remove sensitive data
    delete updatedUser.password
    delete updatedUser.verifyToken

    res.status(StatusCodes.OK).json({
      success: true,
      user: updatedUser
    })
  } catch (error) { next(error) }
}

/**
 * Request password reset
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const result = await userService.requestPasswordReset(req.body.email)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

/**
 * Reset password
 */
const resetPassword = async (req, res, next) => {
  try {
    const result = await userService.resetPassword(req.body)
    res.status(StatusCodes.OK).json(result)
  } catch (error) { next(error) }
}

/**
 * Get all users
 */
const getAllUsers = async (req, res, next) => {
  try {
    // // Check if request is for admin or regular users
    // const role = req.query.role || 'user'
    // console.log('🚀 ~ getAllUsers ~ role:', role)

    // let users
    // if (role === 'admin') {
    //   users = await mergedUserModel.findAllAdmins()
    // } else {
    //   users = await mergedUserModel.findAllUsers()
    // }
    const [regularUsers, adminUsers] = await Promise.all([
      mergedUserModel.findAllUsers(),
      mergedUserModel.findAllAdmins()
    ])

    let users = [...regularUsers, ...adminUsers];
    // Remove sensitive data
    users = users.map(user => {
      const { password, verifyToken, ...userData } = user
      return userData
    })

    res.status(StatusCodes.OK).json({
      success: true,
      users
    })
  } catch (error) { next(error) }
}

/**
 * Handle Google OAuth login
 */
const loginWithGoogle = async (req, res, next) => {
  try {
    // Call the userService loginWithGoogle function
    const result = await userService.loginWithGoogle(req.body)

    // Set cookies for authentication
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: ms('14 days')
    })

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: ms('14 days')
    })

    return res.status(StatusCodes.OK).json(result)
  } catch (error) {
    next(error)
  }
}

export const mergedUserController = {
  createNew,
  verifyAccount,
  loginUser,
  loginAdmin,
  logout,
  refreshToken,
  update,
  updateById,
  requestPasswordReset,
  resetPassword,
  getAllUsers,
  loginWithGoogle
}
