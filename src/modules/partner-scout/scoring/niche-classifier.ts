import { brandProfiles, findBrandProfile } from '@/modules/partner-scout/data/brands.database'
import { NICHE_TO_CHANNEL } from '@/modules/partner-scout/data/niche-filters'
import type { AcceptedNiche, TargetChannel } from '@/modules/partner-scout/data/niche-filters'

export interface Classification {
  accepted: boolean
  niche: AcceptedNiche | null
  targetChannel: TargetChannel | null
  confidence: number
  reasoning: string
  reviewRequired: boolean
  isGameAdaptation: boolean
}

const keywordMap: Array<{ niche: AcceptedNiche; keywords: string[] }> = [
  { niche: 'aaa', keywords: ['launch', 'wishlist', 'open world', 'rpg'] },
  { niche: 'indie', keywords: ['indie', 'festival', 'demo'] },
  { niche: 'mobile', keywords: ['mobile', 'gacha', 'update', 'season'] },
  { niche: 'plataforma_gaming', keywords: ['catalogo', 'assinatura', 'cloud gaming', 'plus'] },
  { niche: 'energetico_snack', keywords: ['energy', 'cupom', 'snack'] },
  { niche: 'streaming', keywords: ['trailer', 'serie', 'estreia'] },
  { niche: 'anime', keywords: ['anime', 'episodio', 'simulcast'] },
  { niche: 'plataforma_video', keywords: ['plataforma', 'franquia', 'streaming'] },
]

export function classifyLead({
  brand,
  keywords,
}: {
  brand: string
  keywords: string[]
}): Classification {
  const profile = findBrandProfile(brand)

  if (profile) {
    return {
      accepted: true,
      niche: profile.niche,
      targetChannel: profile.targetChannel,
      confidence: 0.95,
      reasoning: profile.reasoning,
      reviewRequired: false,
      isGameAdaptation: Boolean(profile.isGameAdaptation),
    }
  }

  const haystack = keywords.join(' ').toLowerCase()

  for (const entry of keywordMap) {
    if (entry.keywords.some((keyword) => haystack.includes(keyword))) {
      const isGameAdaptation = ['fallout', 'the last of us', 'witcher'].some((keyword) => haystack.includes(keyword))
      return {
        accepted: true,
        niche: entry.niche,
        targetChannel: NICHE_TO_CHANNEL[entry.niche],
        confidence: 0.72,
        reasoning: `Classificado por palavras-chave do nicho ${entry.niche}.`,
        reviewRequired: false,
        isGameAdaptation,
      }
    }
  }

  const lowConfidenceBrand = brandProfiles.find((item) => brand.toLowerCase().includes(item.brand.toLowerCase()))

  if (lowConfidenceBrand) {
    return {
      accepted: true,
      niche: lowConfidenceBrand.niche,
      targetChannel: lowConfidenceBrand.targetChannel,
      confidence: 0.55,
      reasoning: 'Marca parecida com entrada conhecida, pede review manual.',
      reviewRequired: true,
      isGameAdaptation: Boolean(lowConfidenceBrand.isGameAdaptation),
    }
  }

  return {
    accepted: false,
    niche: null,
    targetChannel: null,
    confidence: 0,
    reasoning: 'Marca fora dos 6 subnichos aceitos.',
    reviewRequired: false,
    isGameAdaptation: false,
  }
}

