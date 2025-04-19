import { GET_DB } from '~/config/mongodb'

const getSummary = async () => {
  try {
    const usersCollection = GET_DB().collection('users')
    const toursCollection = GET_DB().collection('tours')
    // const bookingsCollection = GET_DB().collection('bookings')

    const userCount = await usersCollection.countDocuments()
    const tourCount = await toursCollection.countDocuments()
    // const bookingCount = await bookingsCollection.countDocuments()

    return {
      userCount,
      tourCount,
      // bookingCount
    }
  } catch (error) {
    throw new Error(error)
  }
}

const getValueDomain = async () => {
  try {
    const toursCollection = GET_DB().collection('tours')

    // Updated to use the actual values stored in the database
    const northern = await toursCollection.countDocuments({ domain: 'b' })
    const central = await toursCollection.countDocuments({ domain: 't' })
    const southern = await toursCollection.countDocuments({ domain: 'n' })

    return {
      b: northern, // Northern Vietnam (miền bắc)
      t: central,  // Central Vietnam (miền trung)
      n: southern  // Southern Vietnam (miền nam)
    }
  } catch (error) {
    throw new Error(error)
  }
}

export const dashboardModel = {
  getSummary,
  getValueDomain,
  // getValuePayment,
  // getMostTourBooked,
  // getNewBooking,
  // getRevenuePerMonth
}
