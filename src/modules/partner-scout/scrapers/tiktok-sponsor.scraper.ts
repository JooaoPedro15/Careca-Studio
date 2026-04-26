import { addDays, getPartnerScoutToday, toIsoDate } from '@/modules/partner-scout/utils/date'

export interface TiktokSponsorDetection {
  brand: string
  date: string
  evidence: string
  sourceChannel: string
  keywords: string[]
  sourceChannelNiche: 'react'
}

export function scrapeTiktokSponsors(): TiktokSponsorDetection[] {
  const today = getPartnerScoutToday()

  return [
    {
      brand: 'Netflix',
      date: toIsoDate(addDays(today, -3)),
      evidence: 'Trailer react patrocinado em Ei Nerd para estreia de temporada.',
      sourceChannel: 'Ei Nerd',
      keywords: ['trailer', 'temporada', 'estreia'],
      sourceChannelNiche: 'react',
    },
    {
      brand: 'Crunchyroll',
      date: toIsoDate(addDays(today, -5)),
      evidence: 'Hashtag #ad em react de episodio de Central Pandora.',
      sourceChannel: 'Central Pandora',
      keywords: ['anime', 'episodio', 'temporada'],
      sourceChannelNiche: 'react',
    },
    {
      brand: 'Prime Video',
      date: toIsoDate(addDays(today, -9)),
      evidence: 'Reveal pago de adaptacao cross-canal em PeeWee.',
      sourceChannel: 'PeeWee',
      keywords: ['adaptacao', 'fallout', 'serie'],
      sourceChannelNiche: 'react',
    },
    {
      brand: 'Max',
      date: toIsoDate(addDays(today, -18)),
      evidence: 'Trailer pago de serie prestigiada em Ei Nerd.',
      sourceChannel: 'Ei Nerd',
      keywords: ['adaptacao', 'trailer', 'serie'],
      sourceChannelNiche: 'react',
    },
    {
      brand: 'Disney+',
      date: toIsoDate(addDays(today, -23)),
      evidence: 'React de franchise em PeeWee com CTA para plataforma.',
      sourceChannel: 'PeeWee',
      keywords: ['franquia', 'streaming', 'serie'],
      sourceChannelNiche: 'react',
    },
    {
      brand: 'Apple TV+',
      date: toIsoDate(addDays(today, -4)),
      evidence: 'First look patrocinado em Ei Nerd com gancho de estreia premium.',
      sourceChannel: 'Ei Nerd',
      keywords: ['first look', 'serie', 'streaming', 'prestige'],
      sourceChannelNiche: 'react',
    },
    {
      brand: 'Paramount+',
      date: toIsoDate(addDays(today, -11)),
      evidence: 'React pago em PeeWee com foco em franquia e trailer novo.',
      sourceChannel: 'PeeWee',
      keywords: ['trailer', 'franquia', 'streaming', 'serie'],
      sourceChannelNiche: 'react',
    },
    {
      brand: 'Aniplex',
      date: toIsoDate(addDays(today, -6)),
      evidence: 'Campanha de anime em Central Pandora com react de temporada.',
      sourceChannel: 'Central Pandora',
      keywords: ['anime', 'temporada', 'trailer', 'episodio'],
      sourceChannelNiche: 'react',
    },
    {
      brand: 'Toho Animation',
      date: toIsoDate(addDays(today, -8)),
      evidence: 'Teaser pago em Central Pandora para puxar fandom e teorias.',
      sourceChannel: 'Central Pandora',
      keywords: ['anime', 'teaser', 'fandom', 'temporada'],
      sourceChannelNiche: 'react',
    },
  ]
}
