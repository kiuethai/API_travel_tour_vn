/* eslint-disable no-useless-catch */
/* eslint-disable no-console */
import { adminModel } from '~/models/adminModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import bcryptjs from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { pickAdmin } from '~/utils/formatters'
import { WEBSITE_DOMAIN } from '~/utils/constants'
import { BrevoProvider } from '~/providers/BrevoProvider'
import { env } from '~/config/environment'
import { JwtProvider } from '~/providers/JwtProvider'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'


const createNew = async (reqBody) => {
  try {
    // Check if email already exists
    const existAdmin = await adminModel.findOneByEmail(reqBody.email)
    if (existAdmin) {
      throw new ApiError(StatusCodes.CONFLICT, 'Email already exists! ')
    }

    // Prepare data for database
    const nameFromEmail = reqBody.email.split('@')[0]
    const newAdmin = {
      email: reqBody.email,
      password: bcryptjs.hashSync(reqBody.password, 8),
      username: nameFromEmail,
      displayName: nameFromEmail,
      verifyToken: uuidv4()
    }

    // Save to database
    const createdAdmin = await adminModel.createNew(newAdmin)
    const getNewAdmin = await adminModel.findOneById(createdAdmin.insertedId)

    // Send verification email
    const verificationLink = `${WEBSITE_DOMAIN}/admin/verification?email=${getNewAdmin.email}&token=${getNewAdmin.verifyToken}`
    const customSubject = 'KTTravel Admin: Please verify your email'
    const htmlContent = `
      <h3>Here is your admin verification link:</h3>
      <h3>${verificationLink}</h3>
      <h3>Sincerely,<br/> - Kiuethai - Một Lập Trình Viên - </h3>
    `
    await BrevoProvider.sendEmail(getNewAdmin.email, customSubject, htmlContent)

    return pickAdmin(getNewAdmin)
  } catch (error) { throw error }
}

const verifyAccount = async (reqBody) => {
  try {
    // Find admin by email
    const existAdmin = await adminModel.findOneByEmail(reqBody.email)

    // Validation checks
    if (!existAdmin) throw new ApiError(StatusCodes.NOT_FOUND, 'Admin account not found')
    if (reqBody.token !== existAdmin.verifyToken) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Token is invalid')

    // Update admin account to verified
    const updateData = {
      verifyToken: null
    }
    const updatedAdmin = await adminModel.update(existAdmin._id, updateData)

    return pickAdmin(updatedAdmin)
  } catch (error) { throw error }
}

const login = async (reqBody) => {
  try {
    // Find admin by email
    const existAdmin = await adminModel.findOneByEmail(reqBody.email)

    // Validation checks
    if (!existAdmin) throw new ApiError(StatusCodes.NOT_FOUND, 'Admin account not found')
    if (!bcryptjs.compareSync(reqBody.password, existAdmin.password)) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Email or Password is incorrect!')
    }

    // Generate tokens
    const adminInfo = { _id: existAdmin._id, email: existAdmin.email, role: 'admin' }

    const accessToken = await JwtProvider.generateToken(
      adminInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_LIFE
    )

    const refreshToken = await JwtProvider.generateToken(
      adminInfo,
      env.REFRESH_TOKEN_SECRET_SIGNATURE,
      env.REFRESH_TOKEN_LIFE
    )

    return { accessToken, refreshToken, ...pickAdmin(existAdmin) }
  } catch (error) { throw error }
}

const refreshToken = async (clientRefreshToken) => {
  try {
    // Verify refresh token
    const refreshTokenDecoded = await JwtProvider.verifyToken(
      clientRefreshToken,
      env.REFRESH_TOKEN_SECRET_SIGNATURE
    )

    const adminInfo = {
      _id: refreshTokenDecoded._id,
      email: refreshTokenDecoded.email,
      role: refreshTokenDecoded.role || 'admin'
    }

    // Generate new access token
    const accessToken = await JwtProvider.generateToken(
      adminInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_LIFE
    )

    return { accessToken }
  } catch (error) { throw error }
}

const update = async (adminId, reqBody, adminAvatarFile) => {
  try {
    // Find admin and validate
    const existAdmin = await adminModel.findOneById(adminId)
    if (!existAdmin) throw new ApiError(StatusCodes.NOT_FOUND, 'Admin account not found!')

    let updatedAdmin = {}

    // Handle password change
    if (reqBody.current_password && reqBody.new_password) {
      if (!bcryptjs.compareSync(reqBody.current_password, existAdmin.password)) {
        throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Current Password is incorrect!')
      }

      updatedAdmin = await adminModel.update(existAdmin._id, {
        password: bcryptjs.hashSync(reqBody.new_password, 8)
      })
    } else if (adminAvatarFile) {
      // Handle avatar upload
      const uploadResult = await CloudinaryProvider.streamUpload(adminAvatarFile.buffer, 'admins')

      updatedAdmin = await adminModel.update(existAdmin._id, {
        avatar: uploadResult.secure_url
      })
    } else {
      // Handle general info update
      updatedAdmin = await adminModel.update(existAdmin._id, reqBody)
    }

    return pickAdmin(updatedAdmin)
  } catch (error) { throw error }
}

export const adminService = {
  createNew,
  verifyAccount,
  login,
  refreshToken,
  update
}
