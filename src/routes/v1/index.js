import express from 'express'
import { StatusCodes } from 'http-status-codes'
import { userRoute } from '~/routes/v1/userRoute'

const Router = express.Router()
/** Check APIS V1/status**/
Router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({ message: 'APIs V1 are ready to use. ', code: StatusCodes.OK })
})    

/* User APIs */
Router.use('/users', userRoute)


export const APIs_V1 = Router
