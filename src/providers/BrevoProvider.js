const SibApiV3Sdk = require('@getbrevo/brevo')
import { env } from '~/config/environment'


let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
console.log('defaultClient authentications: 🚀 ~ apiInstance:', apiInstance)
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

export const BrevoProvider = {
  sendEmail
}