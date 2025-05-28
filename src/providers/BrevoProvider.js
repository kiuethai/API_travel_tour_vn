const SibApiV3Sdk = require('@getbrevo/brevo')
import { env } from '~/config/environment'


let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
// console.log('defaultClient authentications: 🚀 ~ apiInstance:', apiInstance)
let apiKey = apiInstance.authentications['apiKey']
apiKey.apiKey = env.BREVO_API_KEY

const sendEmail = async (recipientEmail, customSubject, customHtmlContent) => {
  // Khởi tạo một cái sendEmail với những thông tin cần thiết
  let sendSmtEmail = new SibApiV3Sdk.SendSmtpEmail()

  // Tài khoản gửi mail: admin email là cái tạo trên Brevo
  sendSmtEmail.sender = { email: env.ADMIN_EMAIL_ADDRESS, name: env.ADMIN_EMAIL_NAME }

  // Những tài khoản nhận email
  // 'to' phải là một Array để sau chúng ta có thể tùy biến gửi 1 email tới nhiều user tùy tính năng dự án
  sendSmtEmail.to = [{ email: recipientEmail }]
  // Tiêu đề của email:
  sendSmtEmail.subject = customSubject

  // Nội dung email dang HTML
  sendSmtEmail.htmlContent = customHtmlContent

  // Gọi hành động gửi mail
  // More info: thằng sendTransacEmail của thư viện nó sẽ return một Promise
  try {
    return await apiInstance.sendTransacEmail(sendSmtEmail)
  } catch (error) {
    console.error('Chi tiết lỗi Brevo:', {
      message: error.message,
      response: error.response?.text || error.response?.body,
      headers: error.response?.headers,
      statusCode: error.status || error.statusCode
    })
    throw error
  }
}

/**
 * Send a password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetLink - The password reset link
 */
const sendPasswordResetEmail = async (email, resetLink) => {
  try {
    const customSubject = 'Vietnam Travel Tours: Đặt lại mật khẩu của bạn'
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background: #f6f8fa; padding: 24px;">
        <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
          <div style="text-align:center; margin-bottom: 24px;">
            <img src="https://res.cloudinary.com/dbkhjufja/image/upload/v1746778897/aycgbvnmphrhmddyjfuw.png" alt="Travel" width="64" />
            <h2 style="color: #2d8fdd; margin: 16px 0 8px;">Vietnam Travel Tours</h2>
            <p style="color: #555; font-size: 16px;">Đặt lại mật khẩu tài khoản của bạn</p>
          </div>
          <div style="font-size: 16px; color: #333; margin-bottom: 24px;">
            <p>Xin chào <b>${email}</b>,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
            <div style="text-align:center; margin: 32px 0;">
              <a href="${resetLink}" style="background: #2d8fdd; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 18px; display: inline-block;">
                Đặt lại mật khẩu
              </a>
            </div> 
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ với chúng tôi nếu bạn có thắc mắc.</p>
          </div>
          <div style="margin-top: 32px; text-align: center; color: #888; font-size: 14px;">
            <em>Vietnam Travel Tours - Kết nối hành trình, khám phá Việt Nam!</em>
            <br/>
            <span style="font-size:12px;">Liên kết này sẽ hết hạn sau 24 giờ.</span>
          </div>
        </div>
      </div>
    `

    // Gọi hàm sendEmail đã có trong BrevoProvider
    return await sendEmail(email, customSubject, htmlContent)
  } catch (error) {
    console.error('Error sending password reset email:', error)
    throw error
  }
}
// Thêm hàm này vào export
export const BrevoProvider = {
  sendEmail,
  sendPasswordResetEmail
}