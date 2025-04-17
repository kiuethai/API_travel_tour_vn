/* eslint-disable no-useless-catch */
/* eslint-disable no-console */
import { userModel } from '~/models/userModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import bcryptjs from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { pickUser } from '~/utils/formatters'
import { WEBSITE_DOMAIN } from '~/utils/constants'
import { BrevoProvider } from '~/providers/BrevoProvider'
import { env } from '~/config/environment'
import { JwtProvider } from '~/providers/JwtProvider'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'

const createNew = async (reqBody) => {
  try {
    // Kiểm tra xem email đã tồn tại trong hệ thống của chúng ta hay chưa
    const existUser = await userModel.findOneByEmail(reqBody.email)
    if (existUser) {
      throw new ApiError(StatusCodes.CONFLICT, 'Email already exists! ')
    }

    // Tạo data để lưu vào Database
    const nameFromEmail = reqBody.email.split('@')[0]
    const newUser = {
      email: reqBody.email,
      password: bcryptjs.hashSync(reqBody.password, 8),
      username: nameFromEmail,
      displayName: nameFromEmail, // mặc định để giống username khi user đăng ký mới, về sau làm tính năng update cho user
      verifyToken: uuidv4()
    }

    // Thực hiện lưu thông tin user vào Database
    const createdUser = await userModel.createNew(newUser)
    const getNewUser = await userModel.findOneById(createdUser.insertedId)

    // Gửi email cho người dùng xác thực tài khoản
    const verificationLink = `${WEBSITE_DOMAIN}/account/verification?email=${getNewUser.email}&token=${getNewUser.verifyToken}`
    const customSubject = 'KTTravel: Please verify your email before using our services!'
    const htmlContent = `
      <h3>Here is your verification link:</h3>
      <h3>${verificationLink}</h3>
      <h3>Sincerely,<br/> - Kiuethai - Một Lập Trình Viên - </h3>
    `
    // Gọi tớ cái Provider gửi mail
    await BrevoProvider.sendEmail(getNewUser.email, customSubject, htmlContent)

    // return trả về dữ liệu cho phía d Controller
    return pickUser(getNewUser)
  } catch (error) { throw error }
}

const verifyAccount = async (reqBody) => {
  try {
    // Query user trong Database
    const existUser = await userModel.findOneByEmail(reqBody.email)


    // Các bước kiểm tra cần thiết
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found')
    if (existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is already active!')
    if (reqBody.token !== existUser.verifyToken) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Token is invalid')

    // Nếu như mọi thứ ok thì chúng ta bắt đầu update lại thông tin của thằng user để verify account
    const updateData = {
      isActive: true,
      verifyAccount: null
    }
    // Thực hiện update thông tin user
    const updatedUser = await userModel.update(existUser._id, updateData)

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

const login = async (reqBody) => {
  try {
    // Query user trong Database
    const existUser = await userModel.findOneByEmail(reqBody.email)

    // Các bước kiểm tra cần thiết
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')
    if (!bcryptjs.compareSync(reqBody.password, existUser.password)) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your Email or Password is incorrect!')
    }

    // Nếu mọi thứ ok thì bắt đầu tạo Tokens đăng nhập ddedeer trả về cho phía FE

    // Tạo thông tin sẽ đính kèm trong JWT Token bao gồm _id và email của user
    const userInfo = { _id: existUser._id, email: existUser.email }

    // Tạo ra 2 loại token, accessToken và refreshToken để trả về cho phía FE
    const accessToken = await JwtProvider.generateToken(
      userInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      env.ACCESS_TOKEN_LIFE
    )

    const refreshToken = await JwtProvider.generateToken(
      userInfo,
      env.REFRESH_TOKEN_SECRET_SIGNATURE,
      env.REFRESH_TOKEN_LIFE
    )
    // Trả về thông tin của user kèm theo 2 cái token vừa tạo ra
    return { accessToken, refreshToken, ...pickUser(existUser) }
  } catch (error) { throw error }
}

const refreshToken = async (clientRefreshToken) => {
  try {
    // Bước 01: Thực hiện giải mã refreshToken xem nó có hợp lệ hay là không
    const refreshTokenDecoded = await JwtProvider.verifyToken(
      clientRefreshToken,
      env.REFRESH_TOKEN_SECRET_SIGNATURE
    )
    // Đoạn này vì chúng ta chỉ lưu những thông tin unique và cố định của user trong token rồi, vì vậy có thể lấy luôn từ decoded ra, tiết kiệm query vào DB để lấy data mới.
    const userInfo = { _id: refreshTokenDecoded._id, email: refreshTokenDecoded.email }

    // Bước 02: Tạo ra cái accessToken mới
    const accessToken = await JwtProvider.generateToken(
      userInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      // 5 // 5 giây
      env.ACCESS_TOKEN_LIFE
    )

    return { accessToken }
  } catch (error) { throw error }
}

const update = async (userId, reqBody, userAvatarFile) => {
  try {
    // Query User và kiểm tra cho chắc chắn
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')

    // Khởi tạo kết quả updated User ban đầu là empty
    let updatedUser = {}

    // Trường hợp change password
    if (reqBody.current_password && reqBody.new_password) {
      // Kiểm tra xem cái current_password có đúng hay không
      if (!bcryptjs.compareSync(reqBody.current_password, existUser.password)) {
        throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your Current Password is incorrect!')
      }
      // Nếu như current_password là đúng thì chúng ta sẽ hash một cái mật khẩu mới và update lại vào DB:
      updatedUser = await userModel.update(existUser._id, {
        password: bcryptjs.hashSync(reqBody.new_password, 8)
      })
    } else if (userAvatarFile) {
      // Trường hợp upload file lên Cloud Storage
      const uploadResult = await CloudinaryProvider.streamUpload(userAvatarFile.buffer, 'users')
      // console.log('🚀 ~ update ~ uploadResult:', uploadResult)

      // Lưu lại url của file ảnh vào trong Database
      updatedUser = await userModel.update(existUser._id, {
        avatar: uploadResult.secure_url
      })
    } else {
      // Trường hợp update các thông tin chung, ví dụ như displayName
      updatedUser = await userModel.update(existUser._id, reqBody)
    }

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

const updateById = async (userId, reqBody) => {
  try {
    // Query User and validate
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found!')

    // Update only allowed fields (isActive, _destroy)
    const updateData = {}
    if (reqBody.isActive !== undefined) updateData.isActive = reqBody.isActive
    if (reqBody._destroy !== undefined) updateData._destroy = reqBody._destroy

    // Update user in database
    const updatedUser = await userModel.update(existUser._id, updateData)

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

const requestPasswordReset = async (email) => {
  try {
    // Kiểm tra xem email đã tồn tại trong hệ thống hay chưa
    const existUser = await userModel.findOneByEmail(email)
    if (!existUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Email không tồn tại trong hệ thống')
    }

    // Tạo reset token duy nhất
    const resetToken = uuidv4()

    // Tạo thời gian hết hạn cho token (24 giờ)
    const resetTokenExpiry = new Date()
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 24)

    // Cập nhật thông tin token vào database
    await userModel.update(existUser._id, {
      resetPasswordToken: resetToken,
      resetPasswordExpiry: resetTokenExpiry
    })

    // Tạo link reset password
    const resetLink = `${WEBSITE_DOMAIN}/account/reset-password?email=${email}&token=${resetToken}`
    const customSubject = 'KTTravel: Yêu cầu đặt lại mật khẩu của bạn'
    const htmlContent = `
      <h3>Xin chào,</h3>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>Nhấp vào liên kết dưới đây để đặt lại mật khẩu:</p>
      <h3><a href="${resetLink}">Đặt lại mật khẩu</a></h3>
      <p>Hoặc sao chép liên kết này: ${resetLink}</p>
      <p>Liên kết này sẽ hết hạn sau 24 giờ.</p>
      <h3>Trân trọng,<br/> - Kiuethai - Một Lập Trình Viên - </h3>
    `

    // Gọi provider gửi email
    await BrevoProvider.sendEmail(email, customSubject, htmlContent)

    return { success: true, message: 'Email đặt lại mật khẩu đã được gửi thành công' }
  } catch (error) { throw error }
}

const resetPassword = async (reqBody) => {
  try {
    // Kiểm tra user với email
    const existUser = await userModel.findOneByEmail(reqBody.email)
    if (!existUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Email không tồn tại trong hệ thống')
    }

    // Kiểm tra token có hợp lệ không
    if (!existUser.resetPasswordToken || existUser.resetPasswordToken !== reqBody.token) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Token không hợp lệ')
    }

    // Kiểm tra token hết hạn chưa
    const now = new Date()
    if (!existUser.resetPasswordExpiry || new Date(existUser.resetPasswordExpiry) < now) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Token đã hết hạn')
    }

    // Hash password mới và cập nhật
    const newPasswordHash = bcryptjs.hashSync(reqBody.newPassword, 8)

    // Update user với mật khẩu mới và xóa token
    const updatedUser = await userModel.update(existUser._id, {
      password: newPasswordHash,
      resetPasswordToken: null,
      resetPasswordExpiry: null
    })

    // Gửi email thông báo đổi mật khẩu thành công
    const customSubject = 'KTTravel: Mật khẩu của bạn đã được thay đổi thành công'
    const htmlContent = `
      <h3>Xin chào,</h3>
      <p>Mật khẩu tài khoản của bạn đã được thay đổi thành công.</p>
      <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức.</p>
      <h3>Trân trọng,<br/> - Kiuethai - Một Lập Trình Viên - </h3>
    `

    await BrevoProvider.sendEmail(existUser.email, customSubject, htmlContent)

    return { success: true, message: 'Đặt lại mật khẩu thành công', user: pickUser(updatedUser) }
  } catch (error) { throw error }
}

const getAllUsers = async () => {
  try {
    const allUsers = await userModel.findAll({ _destroy: false })
    return allUsers.map((user) => pickUser(user))
  } catch (error) {
    throw error
  }
}

export const userService = {
  createNew,
  verifyAccount,
  login,
  refreshToken,
  update,
  updateById,
  requestPasswordReset,
  resetPassword,
  getAllUsers
}