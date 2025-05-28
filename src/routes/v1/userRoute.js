import express from 'express'
import { mergedUserValidation } from '~/validations/mergedUserValidation'
import { mergedUserController } from '~/controllers/mergedUserController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'
const Router = express.Router()

// User routes
Router.route('/register')
  .post(mergedUserValidation.createNew, mergedUserController.createNew)

Router.route('/verify')
  .put(mergedUserValidation.verifyAccount, mergedUserController.verifyAccount)

Router.route('/login')
  .post(mergedUserValidation.login, mergedUserController.loginUser)

Router.route('/login-google')
  .post(mergedUserController.loginWithGoogle)

Router.route('/logout')
  .delete(mergedUserController.logout)

Router.route('/refresh_token')
  .get(mergedUserController.refreshToken)

Router.route('/update')
  .put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.single('avatar'),
    mergedUserValidation.update,
    mergedUserController.update
  )

Router.route('/:id')
  .put(
    authMiddleware.isAuthorized,
    mergedUserValidation.update,
    mergedUserController.updateById
  )

Router.route('/password-reset/request')
  .post(mergedUserValidation.requestPasswordReset, mergedUserController.requestPasswordReset)

Router.route('/password-reset/reset')
  .post(mergedUserValidation.resetPassword, mergedUserController.resetPassword)

Router.route('/getAllUsers')
  .get(authMiddleware.isAuthorized, mergedUserController.getAllUsers)

// Admin routes
Router.route('/admin/register')
  .post(mergedUserValidation.createNew, mergedUserController.createNew)

Router.route('/admin/verify')
  .put(mergedUserValidation.verifyAccount, mergedUserController.verifyAccount)

Router.route('/admin/login')
  .post(mergedUserValidation.login, mergedUserController.loginAdmin)

Router.route('/admin/logout')
  .delete(mergedUserController.logout)

Router.route('/admin/refresh_token')
  .get(mergedUserController.refreshToken)

Router.route('/admin/update')
  .put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.single('avatar'),
    mergedUserValidation.update,
    mergedUserController.update
  )

export const userRoute = Router
