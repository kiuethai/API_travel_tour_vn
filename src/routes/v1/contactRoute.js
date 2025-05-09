import express from 'express'
import { contactController } from '~/controllers/contactController'
const Router = express.Router()

// User gửi liên hệ tới admin
Router.post('/', contactController.contactAdmin)

// Admin phản hồi user
Router.post('/reply', contactController.replyUser)

Router.get('/', contactController.getAllContacts)
export const contactRoute = Router