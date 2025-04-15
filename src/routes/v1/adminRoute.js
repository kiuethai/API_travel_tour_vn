import express from 'express'
import { adminValidation } from '~/validations/adminValidation'
import { adminController } from '~/controllers/adminController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
const Router = express.Router()

Router.route('/register')
  .post(adminValidation.createNew, adminController.createNew)

Router.route('/verify')
  .put(adminValidation.verifyAccount, adminController.verifyAccount)

Router.route('/login')
  .post(adminValidation.login, adminController.login)

Router.route('/logout')
  .delete(adminController.logout)

Router.route('/refresh_token')
  .get(adminController.refreshToken)

Router.route('/update')
  .put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.single('avatar'),
    adminValidation.update,
    adminController.update
  )


export const adminRoute = Router
