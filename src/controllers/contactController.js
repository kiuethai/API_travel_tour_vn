import { StatusCodes } from 'http-status-codes'
import { BrevoProvider } from '~/providers/BrevoProvider'
import { env } from '~/config/environment'
import { contactModel } from '~/models/contactModel'

const contactAdmin = async (req, res, next) => {
  try {
    const { fullName, phoneNumber, email, message } = req.body
    if (!fullName || !phoneNumber || !email || !message) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Missing required fields' })
    }
    // Lưu vào DB
    await contactModel.createNew({ fullName, phoneNumber, email, message })

    // Gửi email tới admin
    await BrevoProvider.sendEmail(
      env.ADMIN_EMAIL_ADDRESS,
      `[Contact] Thông tin liên hệ mới từ ${fullName}`,
      `
      <div style="font-family: Arial, sans-serif; background: #f6f8fa; padding: 24px;">
        <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
          <div style="text-align:center; margin-bottom: 24px;">
            <img src="https://res.cloudinary.com/dbkhjufja/image/upload/v1746778897/aycgbvnmphrhmddyjfuw.png" alt="Travel" width="64" />
            <h2 style="color: #2d8fdd; margin: 16px 0 8px;">Vietnam Travel Tours</h2>
            <p style="color: #555; font-size: 16px;">Bạn nhận được một liên hệ mới từ khách hàng!</p>
          </div>
          <table style="width:100%; font-size: 16px; color: #333;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Họ tên:</td>
              <td style="padding: 8px 0;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">SĐT:</td>
              <td style="padding: 8px 0;">${phoneNumber}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Nội dung:</td>
              <td style="padding: 8px 0;">${message}</td>
            </tr>
          </table>
          <div style="margin-top: 32px; text-align: center; color: #888; font-size: 14px;">
            <em>KTTTravel Tours - Kết nối hành trình, khám phá Việt Nam!</em>
          </div>
        </div>
      </div>
      `
    )
    res.status(StatusCodes.OK).json({ success: true, message: 'Your message has been sent to admin.' })
  } catch (error) {
    next(error)
  }
}

const replyUser = async (req, res, next) => {
  try {
    const { contactId, reply } = req.body
    if (!contactId || !reply) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Missing required fields' })
    }
    const contact = await contactModel.findOneById(contactId)
    if (!contact) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Contact not found' })
    }
    // Gửi email phản hồi cho user
    try {
      await BrevoProvider.sendEmail(
        contact.email,
        '[Admin Reply] Phản hồi liên hệ của bạn',
        `
        <div style="font-family: Arial, sans-serif; background: #f6f8fa; padding: 24px;">
          <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
            <div style="text-align:center; margin-bottom: 24px;">
              <img src="https://res.cloudinary.com/dbkhjufja/image/upload/v1746778897/aycgbvnmphrhmddyjfuw.png" alt="Travel" width="64" />
              <h2 style="color: #2d8fdd; margin: 16px 0 8px;">Vietnam Travel Tours</h2>
              <p style="color: #555; font-size: 16px;">Phản hồi từ đội ngũ hỗ trợ của chúng tôi</p>
            </div>
            <div style="font-size: 16px; color: #333; margin-bottom: 24px;">
              <p>Xin chào <b>${contact.fullName}</b>,</p>
              <div style="background: #eaf6ff; border-left: 4px solid #2d8fdd; padding: 16px; border-radius: 6px; margin: 16px 0;">
                ${reply}
              </div>
              <p style="margin-top: 24px;">Nếu bạn còn thắc mắc, vui lòng phản hồi lại email này hoặc liên hệ hotline hỗ trợ của chúng tôi.</p>
            </div>
            <div style="margin-top: 32px; text-align: center; color: #888; font-size: 14px;">
              <em> KTTTravel Tours - Kết nối hành trình, khám phá Việt Nam!</em>
            </div>
          </div>
        </div>
        `
      )
    } catch (err) {
      console.error('Brevo sendEmail error:', err)
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Gửi email thất bại', error: err.message })
    }
    // Lưu phản hồi vào DB
    await contactModel.updateReply(contactId, reply)
    res.status(StatusCodes.OK).json({ success: true, message: 'Reply sent to user.' })
  } catch (error) {
    next(error)
  }
}

// Lấy danh sách contact (cho admin)
const getAllContacts = async (req, res, next) => {
  try {
    const contacts = await contactModel.findAll()
    res.status(StatusCodes.OK).json({ contacts })
  } catch (error) {
    next(error)
  }
}

export const contactController = {
  contactAdmin,
  replyUser,
  getAllContacts
}