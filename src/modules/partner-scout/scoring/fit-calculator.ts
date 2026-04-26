import type { AcceptedNiche, TicketBand, TimingSignal } from '@/modules/partner-scout/data/niche-filters'

export interface FitScore {
  nicheAlignment: number
  audienceFit: number
  timingScore: number
  competitorProof: number
  budgetFit: number
  total: number
}

const nichePoints: Record<AcceptedNiche, number> = {
  aaa: 30,
  plataforma_gaming: 28,
  streaming: 26,
  mobile: 25,
  anime: 24,
  energetico_snack: 22,
  plataforma_video: 18,
  indie: 18,
}

const ticketPoints: Record<TicketBand, number> = {
  '15k_plus': 20,
  '8_15k': 17,
  '4_8k': 12,
  '2_4k': 6,
  lt_2k: 2,
}

const timingPoints: Record<TimingSignal, number> = {
  launch_30d: 25,
  launch_60d: 18,
  season_launch: 25,
  job_open: 20,
  competitor_7d: 22,
  competitor_30d: 12,
  none: 0,
}

export function calculateFitScore({
  niche,
  audienceFit,
  timingSignal,
  competitorProofCount,
  ticketBand,
}: {
  niche: AcceptedNiche
  audienceFit: number
  timingSignal: TimingSignal
  competitorProofCount: number
  ticketBand: TicketBand
}): FitScore {
  const competitorProof = competitorProofCount >= 3 ? 25 : competitorProofCount >= 1 ? 15 : 5
  const nicheAlignment = nichePoints[niche]
  const timingScore = timingPoints[timingSignal]
  const budgetFit = ticketPoints[ticketBand]
  const weightedTotal =
    nicheAlignment * 0.9 + audienceFit * 1.3 + timingScore * 1.2 + competitorProof * 0.9 + budgetFit * 0.6
  const total = Math.min(100, Math.round(weightedTotal / 1.18))

  return {
    nicheAlignment,
    audienceFit,
    timingScore,
    competitorProof,
    budgetFit,
    total,
  }
}
