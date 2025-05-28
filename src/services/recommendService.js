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

const boostSameRegion = (sourceTour, scoredTours, boostFactor = 0.2) => {
  // Nếu tour gốc không có domain, không thực hiện tăng điểm
  if (!sourceTour || !sourceTour.domain) return scoredTours

  return scoredTours.map(item => {
    if (item.tour.domain === sourceTour.domain) {
      // Tăng điểm cho tours cùng miền
      return { ...item, score: item.score + boostFactor }
    }
    return item
  })
}

const getRecommendations = async ({ userId, clickedTourId, search }) => {
  // console.log('🚀 ~ getRecommendations params:', { userId, clickedTourId, search })
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
    // Thêm domain vào nội dung để tăng matching theo miền
    const domain = tour.domain ?
      (tour.domain === 'b' ? 'miền bắc' :
        tour.domain === 't' ? 'miền trung' :
          tour.domain === 'n' ? 'miền nam' : '') : ''

    const doc = [
      // boost title
      ...Array(2).fill(domain),
      ...Array(3).fill(title), // boost domain
      desc
    ].join(' ')

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
  let sourceTour = null

  // Context: clicked tour
  if (clickedTourId) {
    const i0 = allTours.findIndex(t => t._id.toString() === clickedTourId)
    if (i0 >= 0) {
      sourceTour = allTours[i0]
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
  else if (search) {
    // Kiểm tra xem search có chứa tên miền không
    const lowerSearch = search.toLowerCase()
    const domainMatch = {
      'miền bắc': 'b',
      'miền trung': 't',
      'miền nam': 'n',
      'bắc': 'b',
      'trung': 't',
      'nam': 'n'
    }

    // Tạo tour ảo chứa domain từ search query
    let virtualDomain = null
    for (const [key, value] of Object.entries(domainMatch)) {
      if (lowerSearch.includes(key)) {
        virtualDomain = value
        break
      }
    }

    // Convert query thành vector TF-IDF so sánh với docs
    const queryDoc = search.toLowerCase()
    tfidf.addDocument(queryDoc) // thêm ở cuối, index = allTours.length
    const vq = getVector(allTours.length)
    allTours.forEach((tour, i) => {
      const vi = getVector(i)
      scores.push({ tour, score: cosine(vq, vi) })
    })

    // Nếu tìm thấy domain trong search query, tạo tour ảo để boost miền
    if (virtualDomain) {
      sourceTour = { domain: virtualDomain }
    }
  }

  // Tăng điểm cho các tour cùng miền với tour nguồn
  if (sourceTour) {
    scores = boostSameRegion(sourceTour, scores, 0.3) // Tăng 30% điểm nếu cùng miền
  }

  // Sort và trả về top 5
  const recommendations = scores
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.tour)

  return recommendations
}

export const recommendService = { getRecommendations }