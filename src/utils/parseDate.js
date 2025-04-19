export const parseDate = (dateString) => {
  if (!dateString) return null

  try {
    // Check if it's already a Date object
    if (dateString instanceof Date) return dateString

    // Format: DD/MM/YY or YY/MM/DD
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateString)) {
      // First try DD/MM/YY format
      const [day, month, year] = dateString.split('/').map(Number)
      let date = new Date(2000 + year, month - 1, day)

      // If resulting date is invalid, try YY/MM/DD
      if (isNaN(date.getTime())) {
        const [year, month, day] = dateString.split('/').map(Number)
        date = new Date(2000 + year, month - 1, day)
      }

      return date
    }
    // Format: DD/MM/YYYY
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/').map(Number)
      return new Date(year, month - 1, day)
    }
    // Standard ISO format or other formats
    else {
      return new Date(dateString)
    }
  } catch (error) {
    return null
  }
}