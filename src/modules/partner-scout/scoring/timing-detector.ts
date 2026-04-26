import type { TimingSignal } from '@/modules/partner-scout/data/niche-filters'
import { getPartnerScoutToday } from '@/modules/partner-scout/utils/date'

export interface TimingResult {
  signal: TimingSignal
  score: number
  label: string
}

function diffInDays(fromDate: Date, toDate: Date): number {
  return Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
}

export function detectTimingSignal({
  releaseDates,
  officialSignalDates,
  competitorDates,
  jobDates,
  isSeriesLike,
}: {
  releaseDates: string[]
  officialSignalDates: string[]
  competitorDates: string[]
  jobDates: string[]
  isSeriesLike: boolean
}): TimingResult {
  const today = getPartnerScoutToday()

  const bestRelease = releaseDates
    .map((date) => diffInDays(today, new Date(date)))
    .filter((days) => days >= 0)
    .sort((left, right) => left - right)[0]

  if (typeof bestRelease === 'number' && bestRelease <= 30) {
    return {
      signal: isSeriesLike ? 'season_launch' : 'launch_30d',
      score: 25,
      label: isSeriesLike ? `Temporada estreia em ${bestRelease} dia(s)` : `Lancamento em ${bestRelease} dia(s)`,
    }
  }

  if (typeof bestRelease === 'number' && bestRelease <= 60) {
    return {
      signal: 'launch_60d',
      score: 18,
      label: `Lancamento em ${bestRelease} dia(s)`,
    }
  }

  const recentOfficialSignal = officialSignalDates
    .map((date) => diffInDays(new Date(date), today))
    .filter((days) => days >= 0)
    .sort((left, right) => left - right)[0]

  if (typeof recentOfficialSignal === 'number' && recentOfficialSignal <= 14) {
    return {
      signal: isSeriesLike ? 'season_launch' : 'launch_30d',
      score: 24,
      label: `Canal oficial sinalizou campanha ha ${recentOfficialSignal} dia(s)`,
    }
  }

  const recentCompetitor = competitorDates
    .map((date) => diffInDays(new Date(date), today))
    .filter((days) => days >= 0)
    .sort((left, right) => left - right)[0]

  if (typeof recentCompetitor === 'number' && recentCompetitor <= 7) {
    return {
      signal: 'competitor_7d',
      score: 22,
      label: `Patrocinou concorrente ha ${recentCompetitor} dia(s)`,
    }
  }

  if (typeof recentCompetitor === 'number' && recentCompetitor <= 30) {
    return {
      signal: 'competitor_30d',
      score: 12,
      label: `Patrocinou concorrente ha ${recentCompetitor} dia(s)`,
    }
  }

  const recentJob = jobDates
    .map((date) => diffInDays(new Date(date), today))
    .filter((days) => days >= 0)
    .sort((left, right) => left - right)[0]

  if (typeof recentJob === 'number' && recentJob <= 14) {
    return {
      signal: 'job_open',
      score: 20,
      label: `Vaga de marketing aberta ha ${recentJob} dia(s)`,
    }
  }

  return {
    signal: 'none',
    score: 0,
    label: 'Sem timing forte agora',
  }
}
