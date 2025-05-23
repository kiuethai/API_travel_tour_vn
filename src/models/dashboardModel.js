import { GET_DB } from '~/config/mongodb'
import { ObjectId } from 'mongodb'

const getSummary = async () => {
  try {
    const usersCollection = GET_DB().collection('users')
    const toursCollection = GET_DB().collection('tours')
    const bookingsCollection = GET_DB().collection('bookings')

    const userCount = await usersCollection.countDocuments()
    const tourCount = await toursCollection.countDocuments()
    const bookingCount = await bookingsCollection.countDocuments()

    return {
      userCount,
      tourCount,
      bookingCount
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

const getValuePayment = async () => {
  try {
    const checkoutsCollection = GET_DB().collection('checkouts')

    // Use aggregation to calculate both count and total revenue by payment method
    const paymentStats = await checkoutsCollection.aggregate([
      { $match: { paymentStatus: 'y' } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: { $toDouble: '$amount' } }
        }
      }
    ]).toArray()

    // Initialize result object with zeros
    const result = {
      paypal: { count: 0, revenue: 0 },
      momo: { count: 0, revenue: 0 },
      office: { count: 0, revenue: 0 },
      totalRevenue: 0
    }

    // Fill in the data from aggregation results
    let totalRevenue = 0
    paymentStats.forEach(stat => {
      const method = stat._id.replace('-payment', '')
      if (result[method]) {
        result[method] = {
          count: stat.count,
          revenue: stat.revenue
        }
        totalRevenue += stat.revenue
      }
    })

    result.totalRevenue = totalRevenue

    return result
  } catch (error) {
    throw new Error(error)
  }
}

const getMostTourBooked = async () => {
  try {
    const bookingsCollection = GET_DB().collection('bookings')
    const toursCollection = GET_DB().collection('tours')

    // Aggregate to count bookings by tourId
    const tourBookings = await bookingsCollection.aggregate([
      { $match: { _destroy: false } },
      { $group: { _id: '$tourId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]).toArray()

    // Get tour details for each of the most booked tours
    const toursBooked = await Promise.all(
      tourBookings.map(async (item) => {
        const tour = await toursCollection.findOne({ _id: new ObjectId(item._id) })
        return {
          _id: item._id,
          title: tour?.title || 'Tour không còn tồn tại',
          bookingCount: item.count,
          thumbnail: tour?.thumbnail || null
        }
      })
    )

    return toursBooked
  } catch (error) {
    throw new Error(error)
  }
}

const getNewBooking = async () => {
  try {
    const bookingsCollection = GET_DB().collection('bookings')

    // Get last 5 bookings sorted by creation date
    const newBookings = await bookingsCollection.find({ _destroy: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray()

    return newBookings
  } catch (error) {
    throw new Error(error)
  }
}

const getRevenuePerMonth = async () => {
  try {
    const checkoutsCollection = GET_DB().collection('checkouts')
    const currentYear = new Date().getFullYear()

    // Aggregate to get revenue by month for the current year
    const revenue = await checkoutsCollection.aggregate([
      {
        $match: {
          status: 'completed',
          $expr: { $eq: [{ $year: { $toDate: { $multiply: ['$createdAt', 1] } } }, currentYear] }
        }
      },
      {
        $group: {
          _id: { $month: { $toDate: { $multiply: ['$createdAt', 1] } } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray()

    // Format to array of 12 months with revenue
    const monthlyRevenue = Array(12).fill(0)

    revenue.forEach(item => {
      monthlyRevenue[item._id - 1] = item.total
    })

    return monthlyRevenue
  } catch (error) {
    throw new Error(error)
  }
}

export const dashboardModel = {
  getSummary,
  getValueDomain,
  getValuePayment,
  getMostTourBooked,
  getNewBooking,
  getRevenuePerMonth
}
