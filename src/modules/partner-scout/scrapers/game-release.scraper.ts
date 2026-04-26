import { addDays, formatDaysFromToday, getPartnerScoutToday, toIsoDate } from '@/modules/partner-scout/utils/date'

export interface GameReleaseSignal {
  brand: string
  gameTitle: string
  releaseDate: string
  evidence: string
}

export function scrapeUpcomingGameReleases(): GameReleaseSignal[] {
  const today = getPartnerScoutToday()
  const ubisoftDate = addDays(today, 19)
  const bandaiDate = addDays(today, 33)
  const hoyoverseDate = addDays(today, 9)
  const eaDate = addDays(today, 14)
  const capcomDate = addDays(today, 21)
  const riotDate = addDays(today, 7)

  return [
    {
      brand: 'Ubisoft',
      gameTitle: 'janela de reveal de AAA em campanha',
      releaseDate: toIsoDate(ubisoftDate),
      evidence: `Janela de reveal e wishlist para campanha AAA ${formatDaysFromToday(ubisoftDate)}.`,
    },
    {
      brand: 'Bandai Namco',
      gameTitle: 'RPG com apelo anime em pre-lancamento',
      releaseDate: toIsoDate(bandaiDate),
      evidence: `RPG com apelo anime entra em janela de burst ${formatDaysFromToday(bandaiDate)}.`,
    },
    {
      brand: 'HoYoverse',
      gameTitle: 'major update mobile com incentivo de conversao',
      releaseDate: toIsoDate(hoyoverseDate),
      evidence: `Update major mobile programado ${formatDaysFromToday(hoyoverseDate)} com chance de CTA curto.`,
    },
    {
      brand: 'EA',
      gameTitle: 'janela de campanha para AAA esportivo e wishlist',
      releaseDate: toIsoDate(eaDate),
      evidence: `Campanha de reveal de alto awareness prevista ${formatDaysFromToday(eaDate)}.`,
    },
    {
      brand: 'Capcom',
      gameTitle: 'trailer de acao com gancho forte para gameplay curto',
      releaseDate: toIsoDate(capcomDate),
      evidence: `Nova janela de trailer abre ${formatDaysFromToday(capcomDate)}.`,
    },
    {
      brand: 'Riot Games',
      gameTitle: 'season update competitiva com evento in game',
      releaseDate: toIsoDate(riotDate),
      evidence: `Season update entra ${formatDaysFromToday(riotDate)} com foco em evento e comunidade.`,
    },
  ]
}
