import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userRoute } from '~/routes/v1/userRoute'
import { tourRoute } from '~/routes/v1/tourRoute'
import { dashboardRoute } from '~/routes/v1/dashboardRoute'
import { bookingRoute } from './bookingRoute'
import { contactRoute } from '~/routes/v1/contactRoute'
import { reviewRoute } from '~/routes/v1/reviewRoute'
import { chatRoutes } from '~/routes/v1/chatRoutes'

const Router = express.Router()
/** Check APIS V1/status**/
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use. ', code: StatusCodes.OK })
})

/* User APIs (now includes admin endpoints under /users/admin/*) */
Router.use('/users', userRoute)

/* Tour APIs */
Router.use('/tours', tourRoute)

/* Dashboard APIs */
Router.use('/dashboard', dashboardRoute)

/* Booking APIs */
Router.use('/booking', bookingRoute)

/* Contact APIs */
Router.use('/contact', contactRoute)

/* Review APIs */
Router.use('/reviews', reviewRoute)

/* Chat APIs */
Router.use('/chat', chatRoutes)

export const APIs_V1 = Router
