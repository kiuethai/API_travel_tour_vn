import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userRoute } from '~/routes/v1/userRoute'
import { adminRoute } from '~/routes/v1/adminRoute'
import { tourRoute } from '~/routes/v1/tourRoute'

const Router = express.Router()
/** Check APIS V1/status**/
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use. ', code: StatusCodes.OK })
})

/* User APIs */
Router.use('/users', userRoute)

/* Admin APIs */
Router.use('/admin', adminRoute)

/* Tour APIs */
Router.use('/tours', tourRoute)


export const APIs_V1 = Router
