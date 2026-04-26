import { addDays, formatDaysFromToday, getPartnerScoutToday, toIsoDate } from '@/modules/partner-scout/utils/date'

export interface SeriesReleaseSignal {
  brand: string
  title: string
  releaseDate: string
  evidence: string
  type: 'series' | 'anime'
}

export function scrapeUpcomingSeriesReleases(): SeriesReleaseSignal[] {
  const today = getPartnerScoutToday()
  const netflixDate = addDays(today, 12)
  const crunchyrollDate = addDays(today, 6)
  const primeDate = addDays(today, 15)
  const maxDate = addDays(today, 24)
  const appleDate = addDays(today, 10)
  const paramountDate = addDays(today, 18)
  const aniplexDate = addDays(today, 8)
  const tohoDate = addDays(today, 13)

  return [
    {
      brand: 'Netflix',
      title: 'trailer de temporada em janela de estreia',
      releaseDate: toIsoDate(netflixDate),
      evidence: `Trailer principal previsto ${formatDaysFromToday(netflixDate)} para puxar react de estreia.`,
      type: 'series',
    },
    {
      brand: 'Crunchyroll',
      title: 'lineup da temporada atual de anime',
      releaseDate: toIsoDate(crunchyrollDate),
      evidence: `Nova janela de simulcast entra ${formatDaysFromToday(crunchyrollDate)}.`,
      type: 'anime',
    },
    {
      brand: 'Prime Video',
      title: 'adaptacao de game em campanha de trailer',
      releaseDate: toIsoDate(primeDate),
      evidence: `Campanha de adaptacao cross-canal prevista ${formatDaysFromToday(primeDate)}.`,
      type: 'series',
    },
    {
      brand: 'Max',
      title: 'first look de franquia premium',
      releaseDate: toIsoDate(maxDate),
      evidence: `Primeira janela de campanha premium abre ${formatDaysFromToday(maxDate)}.`,
      type: 'series',
    },
    {
      brand: 'Apple TV+',
      title: 'serie premium em janela de first look',
      releaseDate: toIsoDate(appleDate),
      evidence: `First look oficial previsto ${formatDaysFromToday(appleDate)}.`,
      type: 'series',
    },
    {
      brand: 'Paramount+',
      title: 'franquia em nova campanha de trailer',
      releaseDate: toIsoDate(paramountDate),
      evidence: `Campanha de trailer abre ${formatDaysFromToday(paramountDate)}.`,
      type: 'series',
    },
    {
      brand: 'Aniplex',
      title: 'anime de temporada com estreia proxima',
      releaseDate: toIsoDate(aniplexDate),
      evidence: `Janela de estreia de anime abre ${formatDaysFromToday(aniplexDate)}.`,
      type: 'anime',
    },
    {
      brand: 'Toho Animation',
      title: 'teaser de anime com fandom ativo',
      releaseDate: toIsoDate(tohoDate),
      evidence: `Novo teaser entra ${formatDaysFromToday(tohoDate)} para puxar teorias e hype.`,
      type: 'anime',
    },
  ]
}
