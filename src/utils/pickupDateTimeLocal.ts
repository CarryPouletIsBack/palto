/** Même seuil que la page Go : datetime-local seul déborde sur iOS / mobile étroit. */
export const MOBILE_DATETIME_SPLIT_MQ = '(max-width: 768px)'

export function splitDateTimeLocal(value: string): { date: string; time: string } {
  if (!value || value.length < 10) return { date: '', time: '' }
  const date = value.slice(0, 10)
  const time = value.length >= 16 ? value.slice(11, 16) : ''
  return { date, time }
}

export function mergeDateTimeLocal(date: string, time: string, fallbackMin: string): string {
  const minParts = splitDateTimeLocal(fallbackMin)
  const resolvedDate = date || minParts.date
  const resolvedTime = time || '12:00'
  if (!resolvedDate) return ''
  return `${resolvedDate}T${resolvedTime}`
}
