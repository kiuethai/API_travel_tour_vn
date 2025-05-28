import JWT from 'jsonwebtoken'
const { OAuth2Client } = require('google-auth-library')
import { env } from '~/config/environment'
import { userModel } from '~/models/userModel'
import bcryptjs from 'bcryptjs'

/*
  Function tạo mới một token - cần 3 tham số đầu vào
  userInfo: Những thông tin  muốn đính kèm vào token
  secretSignature: Chữ ký bí mật (dạng một chuỗi string ngẫu nhiên) trên docs thì để tên là privateKey tùy đều được
  tokenLife: Thời gian sống của token
*/
const client = new OAuth2Client(env.GG_CLIENT_ID)


const generateToken = async (userInfo, secretSignature, tokenLife) => {
  try {
    return JWT.sign(userInfo, secretSignature, { algorithm: 'HS256', expiresIn: tokenLife })
  } catch (error) { throw new Error(error) }
}

/*
    Function kiểm tra một token có hợp lệ hay không
    Hợp lệ ở đây hiểu đơn giản là cái token được tạo ra có đúng với cái chữ ký bí mật secretSignature trong dự án hay không
*/
const verifyToken = async (token, secretSignature) => {
  try {
    // Hàm verify của thư viện JWT
    return JWT.verify(token, secretSignature)
  } catch (error) { throw new Error(error) }
}

/*
  Function to decode a JWT token without verifying the signature
  Used for Google OAuth where we trust the token from Google and just need to extract the data
*/
const decodeToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: env.GG_CLIENT_ID
    })

    const payload = ticket.getPayload()
    console.log('🚀 ~ decodeToken ~ payload:', payload)
    if (!payload) {
      throw new Error('Invalid token payload')
    }

    // Return the payload with essential user info from Google
    return {
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      verifyToken: token
    }
  } catch (error) {
    console.error('Google token validation error:', error.message)
    throw new Error('Invalid Google token. Please try again.')
  }
}
const handleGoogleAuth = async (token) => {
  try {
    // Decode the Google token
    const googleUserInfo = await decodeToken(token)
    // console.log('googleUserInfo:', googleUserInfo)
    // console.log('token:', token)
    // Check if user already exists in database
    const existingUser = await userModel.findOneByEmail({ email: googleUserInfo.email })

    if (existingUser) {
      // User exists - generate authentication token for existing user
      const userInfo = {
        _id: existingUser._id,
        email: existingUser.email,
        role: existingUser.role || 'user'
      }

      const accessToken = await generateToken(
        userInfo
        , env.ACCESS_TOKEN_SECRET_SIGNATURE,
        env.ACCESS_TOKEN_LIFE
      )

      return {
        isNewUser: false,
        user: existingUser,
        accessToken
      }
    } else {
      // Create new user with Google information - match required fields in your schema
      const nameFromEmail = googleUserInfo.email.split('@')[0]

      const newUser = await userModel.createNew({
        email: googleUserInfo.email,
        // Generate a random secure password for users signing up with Google
        password: bcryptjs.hashSync(Math.random().toString(36).slice(-8) + Date.now().toString(), 8),
        username: nameFromEmail,
        displayName: googleUserInfo.name || nameFromEmail,
        avatar: googleUserInfo.picture,
        isActive: true,  // Google users come pre-verified
        verifyToken: token.substring(0, 255)
      })

      // Get the newly created user to return with complete data
      const retrievedUser = await userModel.findOneById(newUser.insertedId)

      const userInfo = {
        email: retrievedUser.email,
        role: retrievedUser.role || 'user'
      }

      const accessToken = await generateToken(
        userInfo
        , env.ACCESS_TOKEN_SECRET_SIGNATURE,
        env.ACCESS_TOKEN_LIFE
      )

      return {
        isNewUser: true,
        user: retrievedUser,
        accessToken
      }
    }
  } catch (error) {
    console.error('Google authentication error:', error.message)
    throw new Error(error.message || 'Failed to authenticate with Google')
  }
}

export const JwtProvider = {
  generateToken,
  verifyToken,
  decodeToken,
  handleGoogleAuth
}