import { tourModel } from '~/models/tourModel'
import { dashboardModel } from '~/models/dashboardModel'
import natural from 'natural'

const TfIdf = natural.TfIdf
const tokenizer = new natural.WordTokenizer()

// Hàm tính cosine similarity giữa 2 vector dạng { term: weight }
const cosine = (v1, v2) => {
  const intersection = Object.keys(v1).filter(t => v2[t])
  const dot = intersection.reduce((sum, t) => sum + v1[t] * v2[t], 0)
  const mag = vec => Math.sqrt(Object.values(vec).reduce((s, w) => s + w * w, 0))
  return dot / (mag(v1) * mag(v2) + 1e-8)
}

const getRecommendations = async ({ userId, clickedTourId, searchQuery }) => {
  // If user not logged in or no context, return top booked tours
  if (!userId) {
    const topBookings = await dashboardModel.getMostTourBooked()
    // Fetch full tour details
    const tours = await Promise.all(
      topBookings.map(item => tourModel.findOneById(item._id.toString()))
    )
    return tours.filter(Boolean)
  }

  // Gather all tours
  const allTours = await tourModel.findAll()
  const tfidf = new TfIdf()

  // Build corpus với title được boost 3 lần, remove stop-words, lowerCase
  allTours.forEach(tour => {
    const title = (tour.title || '').toLowerCase()
    const desc = (tour.description || '').toLowerCase()
    const doc = [
      ...Array(3).fill(title),      // boost title
      desc
    ].join(' ')
    // bạn có thể tokenizer và remove stop-words ở đây nếu cần
    tfidf.addDocument(doc)
  })

  // Lấy vector TF-IDF của 1 doc
  const getVector = idx => {
    return tfidf.listTerms(idx).reduce((v, item) => {
      v[item.term] = item.tfidf
      return v
    }, {})
  }

  let scores = []
  // Context: clicked tour
  if (clickedTourId) {
    const i0 = allTours.findIndex(t => t._id.toString() === clickedTourId)
    if (i0 >= 0) {
      const v0 = getVector(i0)
      allTours.forEach((tour, i) => {
        if (i !== i0) {
          const vi = getVector(i)
          scores.push({ tour, score: cosine(v0, vi) })
        }
      })
    }
  }
  // Context: search query
  else if (searchQuery) {
    // Convert query thành vector TF-IDF so sánh với docs
    const queryDoc = searchQuery.toLowerCase()
    tfidf.addDocument(queryDoc)  // thêm ở cuối, index = allTours.length
    const vq = getVector(allTours.length)
    allTours.forEach((tour, i) => {
      const vi = getVector(i)
      scores.push({ tour, score: cosine(vq, vi) })
    })
  }

  // Sort và trả về top 5
  const recommendations = scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.tour)

  return recommendations
}

export const recommendService = { getRecommendations }