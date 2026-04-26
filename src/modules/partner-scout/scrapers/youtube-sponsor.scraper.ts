import { addDays, getPartnerScoutToday, toIsoDate } from '@/modules/partner-scout/utils/date'

export interface YoutubeSponsorDetection {
  brand: string
  date: string
  evidence: string
  sourceChannel: string
  keywords: string[]
  sourceChannelNiche: 'games'
}

export function scrapeYoutubeSponsors(): YoutubeSponsorDetection[] {
  const today = getPartnerScoutToday()

  return [
    {
      brand: 'Ubisoft',
      date: toIsoDate(addDays(today, -4)),
      evidence: 'Patrocinou BRKsEDU com CTA para wishlist e janela de reveal AAA.',
      sourceChannel: 'BRKsEDU',
      keywords: ['aaa', 'launch', 'wishlist', 'reveal'],
      sourceChannelNiche: 'games',
    },
    {
      brand: 'Xbox Game Pass',
      date: toIsoDate(addDays(today, -6)),
      evidence: 'Insercao em Davy Jones destacando 5 jogos do catalogo.',
      sourceChannel: 'Davy Jones',
      keywords: ['catalogo', 'game pass', 'assinatura'],
      sourceChannelNiche: 'games',
    },
    {
      brand: 'Monster',
      date: toIsoDate(addDays(today, -8)),
      evidence: 'Cupom + publipost em gameplay de Coisa de Nerd.',
      sourceChannel: 'Coisa de Nerd',
      keywords: ['cupom', 'gaming night', 'energy'],
      sourceChannelNiche: 'games',
    },
    {
      brand: 'HoYoverse',
      date: toIsoDate(addDays(today, -12)),
      evidence: 'Evento mobile anunciado em FunkyBlackCat com gameplay dedicado.',
      sourceChannel: 'FunkyBlackCat',
      keywords: ['mobile', 'update', 'event'],
      sourceChannelNiche: 'games',
    },
    {
      brand: 'PlayStation Plus',
      date: toIsoDate(addDays(today, -16)),
      evidence: 'Lista de jogos do mes patrocinada em BRKsEDU.',
      sourceChannel: 'BRKsEDU',
      keywords: ['jogos do mes', 'plus', 'catalogo'],
      sourceChannelNiche: 'games',
    },
    {
      brand: 'Red Bull',
      date: toIsoDate(addDays(today, -24)),
      evidence: 'Campanha de creator em Davy Jones com desafio de gameplay.',
      sourceChannel: 'Davy Jones',
      keywords: ['gaming', 'energy', 'creator'],
      sourceChannelNiche: 'games',
    },
    {
      brand: 'EA',
      date: toIsoDate(addDays(today, -5)),
      evidence: 'Reveal patrocinado em Coisa de Nerd com foco em wishlist.',
      sourceChannel: 'Coisa de Nerd',
      keywords: ['aaa', 'launch', 'wishlist', 'sports'],
      sourceChannelNiche: 'games',
    },
    {
      brand: 'Capcom',
      date: toIsoDate(addDays(today, -10)),
      evidence: 'Janela de trailer puxada em FunkyBlackCat com gameplay curto.',
      sourceChannel: 'FunkyBlackCat',
      keywords: ['action', 'trailer', 'launch', 'gameplay'],
      sourceChannelNiche: 'games',
    },
    {
      brand: 'Riot Games',
      date: toIsoDate(addDays(today, -7)),
      evidence: 'Campanha de update competitiva em BRKsEDU com CTA de evento.',
      sourceChannel: 'BRKsEDU',
      keywords: ['update', 'event', 'competitive', 'season'],
      sourceChannelNiche: 'games',
    },
    {
      brand: 'Epic Games Store',
      date: toIsoDate(addDays(today, -9)),
      evidence: 'Insercao em Davy Jones destacando jogo gratis e catalogo da semana.',
      sourceChannel: 'Davy Jones',
      keywords: ['catalogo', 'free game', 'store', 'pc'],
      sourceChannelNiche: 'games',
    },
  ]
}
