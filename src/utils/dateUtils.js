/**
 * Tính toán thời gian tour dựa trên ngày bắt đầu và kết thúc
 * @param {Date} startDate - Ngày bắt đầu tour
 * @param {Date} endDate - Ngày kết thúc tour
 * @returns {string} - Chuỗi thời gian định dạng "X ngày Y đêm"
 */
export const calculateTourDuration = (startDate, endDate) => {
  // Chuyển đổi sang Date objects nếu chưa phải
  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)

  // Tính số mili giây giữa hai ngày
  const timeDiff = Math.abs(end.getTime() - start.getTime())

  // Chuyển đổi mili giây thành ngày
  const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) - 1

  // Số đêm = số ngày - 1
  const nights = days - 2

  // Trả về chuỗi theo định dạng "X ngày Y đêm"
  return `${days} ngày ${nights} đêm`
}
