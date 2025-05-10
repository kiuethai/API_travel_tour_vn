import express from 'express'
import { defaultTo } from 'lodash'
import { reviewService } from '~/services/reviewService'
import { authMiddleware } from '~/middlewares/authMiddleware'

const Router = express.Router()

Router.post('/',
  authMiddleware.isAuthorized,
  async (req, res, next) => {
    try {
      const review = await reviewService.addReview(req.body)
      res.status(201).json(review)
    } catch (error) {
      next(error)
    }
  })

export const reviewRoute = Router