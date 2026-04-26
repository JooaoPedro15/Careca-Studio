import type { MediaKitData } from '@/modules/media-kit/data/mediakit.schema'

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long' })

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K`
  }

  return value.toString()
}

function getShiftedDate(referenceDate: Date, shiftMonths: number): Date {
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth() + shiftMonths, referenceDate.getDate())
}

export function buildPlaceholderMap(data: MediaKitData, referenceDate = new Date()): Record<string, string> {
  const currentMonth = monthFormatter.format(referenceDate)
  const previousMonth = monthFormatter.format(getShiftedDate(referenceDate, -1))

  return {
    '{mes_atual}': currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1),
    '{mes_anterior}': previousMonth.charAt(0).toUpperCase() + previousMonth.slice(1),
    '{ano_atual}': referenceDate.getFullYear().toString(),
    '{ano_anterior}': (referenceDate.getFullYear() - 1).toString(),
    '{data_hoje}': new Intl.DateTimeFormat('pt-BR').format(referenceDate),
    '{inscritos_main}': formatCompactNumber(data.commercialChannels.main.youtube.subscribers),
    '{views_mensais_main}': formatCompactNumber(data.commercialChannels.main.youtube.monthlyViews),
    '{shorts_avg_combined_main}': formatCompactNumber(data.combinedShortsReach.main.averagePerPublication),
    '{shorts_top_main}': formatCompactNumber(data.commercialChannels.main.youtube.shortsPerformance.topViews),
    '{seguidores_react}': formatCompactNumber(data.commercialChannels.react.tiktok.followers),
  }
}

export function resolvePlaceholders(input: string, data: MediaKitData, referenceDate = new Date()): string {
  const tokens = buildPlaceholderMap(data, referenceDate)

  return Object.entries(tokens).reduce((accumulator, [token, value]) => {
    return accumulator.replaceAll(token, value)
  }, input)
}

