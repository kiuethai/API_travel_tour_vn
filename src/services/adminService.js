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
    const customSubject = 'Quản trị viên KTTravel: Vui lòng xác minh email của bạn'
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background: #f6f8fa; padding: 24px;">
        <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
          <div style="text-align:center; margin-bottom: 24px;">
            <img src="https://res.cloudinary.com/dbkhjufja/image/upload/v1746778897/aycgbvnmphrhmddyjfuw.png" alt="Travel" width="64" />
            <h2 style="color: #2d8fdd; margin: 16px 0 8px;">Vietnam Travel Tours</h2>
            <p style="color: #555; font-size: 16px;">Chào mừng bạn đến với hệ thống quản trị KTTravel!</p>
          </div>
          <div style="font-size: 16px; color: #333; margin-bottom: 24px;">
            <p>Xin chào <b>${getNewAdmin.email}</b>,</p>
            <p>Vui lòng xác thực tài khoản quản trị viên của bạn bằng cách nhấn vào nút bên dưới:</p>
            <div style="text-align:center; margin: 32px 0;">
              <a href="${verificationLink}" style="background: #2d8fdd; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 18px; display: inline-block;">
                Xác thực tài khoản
              </a>
            </div>
            <p>Nếu nút không hoạt động, hãy copy và dán liên kết sau vào trình duyệt:</p>
            <div style="background: #eaf6ff; border-left: 4px solid #2d8fdd; padding: 12px; border-radius: 6px; word-break: break-all;">
              ${verificationLink}
            </div>
          </div>
          <div style="margin-top: 32px; text-align: center; color: #888; font-size: 14px;">
            <em>Vietnam Travel Tours - Kết nối hành trình, khám phá Việt Nam!</em>
            <br/>
            <span style="font-size:12px;">Sincerely,<br/>- Kiuethai - Một Lập Trình Viên -</span>
          </div>
        </div>
      </div>
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
