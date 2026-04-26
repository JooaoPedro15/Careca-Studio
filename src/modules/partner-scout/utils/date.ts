function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getPartnerScoutToday(): Date {
  return toStartOfDay(new Date())
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return toStartOfDay(copy)
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function daysBetween(fromDate: Date, toDate: Date): number {
  return Math.floor((toStartOfDay(toDate).getTime() - toStartOfDay(fromDate).getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDaysFromToday(targetDate: Date, baseDate = getPartnerScoutToday()): string {
  const diff = daysBetween(baseDate, targetDate)

  if (diff === 0) {
    return 'hoje'
  }

  if (diff === 1) {
    return 'amanha'
  }

  if (diff > 1) {
    return `em ${diff} dias`
  }

  if (diff === -1) {
    return 'ontem'
  }

  return `${Math.abs(diff)} dias atras`
}

