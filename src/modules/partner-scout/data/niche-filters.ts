export type GameNiche = 'aaa' | 'indie' | 'mobile' | 'plataforma_gaming' | 'energetico_snack'
export type StreamingNiche = 'streaming' | 'anime' | 'plataforma_video'
export type AcceptedNiche = GameNiche | StreamingNiche
export type TargetChannel = 'main' | 'react'
export type LeadTab = 'all' | TargetChannel
export type TimingSignal =
  | 'launch_30d'
  | 'launch_60d'
  | 'season_launch'
  | 'job_open'
  | 'competitor_7d'
  | 'competitor_30d'
  | 'none'
export type TicketBand = 'lt_2k' | '2_4k' | '4_8k' | '8_15k' | '15k_plus'

export const NICHE_TO_CHANNEL: Record<AcceptedNiche, TargetChannel> = {
  aaa: 'main',
  indie: 'main',
  mobile: 'main',
  plataforma_gaming: 'main',
  energetico_snack: 'main',
  streaming: 'react',
  anime: 'react',
  plataforma_video: 'react',
}

export const nicheLabels: Record<AcceptedNiche, string> = {
  aaa: 'AAA',
  indie: 'Indie',
  mobile: 'Mobile',
  plataforma_gaming: 'Plataforma gaming',
  energetico_snack: 'Energetico/snack',
  streaming: 'Streaming',
  anime: 'Anime',
  plataforma_video: 'Plataforma de video',
}

export const targetChannelLabels: Record<TargetChannel, string> = {
  main: 'Canal principal (Games)',
  react: 'TikTok React (Streaming/Anime)',
}

export const timingLabels: Record<TimingSignal, string> = {
  launch_30d: 'Lancamento em ate 30 dias',
  launch_60d: 'Lancamento em ate 60 dias',
  season_launch: 'Temporada em estreia',
  job_open: 'Vaga de marketing recente',
  competitor_7d: 'Patrocinou concorrente na ultima semana',
  competitor_30d: 'Patrocinou concorrente no ultimo mes',
  none: 'Sem sinal forte',
}

export const ticketBandLabels: Record<TicketBand, string> = {
  lt_2k: '< R$ 2k',
  '2_4k': 'R$ 2k-4k',
  '4_8k': 'R$ 4k-8k',
  '8_15k': 'R$ 8k-15k',
  '15k_plus': 'R$ 15k+',
}

export const acceptedNicheList = Object.keys(NICHE_TO_CHANNEL) as AcceptedNiche[]
export const gameNicheList: GameNiche[] = ['aaa', 'indie', 'mobile', 'plataforma_gaming', 'energetico_snack']

export function isGameNiche(value: AcceptedNiche): value is GameNiche {
  return gameNicheList.includes(value as GameNiche)
}

export function getTicketBand(value: number): TicketBand {
  if (value >= 15_000) {
    return '15k_plus'
  }

  if (value >= 8_000) {
    return '8_15k'
  }

  if (value >= 4_000) {
    return '4_8k'
  }

  if (value >= 2_000) {
    return '2_4k'
  }

  return 'lt_2k'
}
