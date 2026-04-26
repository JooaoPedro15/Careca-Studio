import type { MediaKitData, MediaKitTemplate } from '@/modules/media-kit/data/mediakit.schema'
import { nicheLabels, type AcceptedNiche, type TargetChannel, type TimingSignal } from '@/modules/partner-scout/data/niche-filters'

export interface BundleRecommendationLead {
  brand: string
  niche: AcceptedNiche
  targetChannel: TargetChannel
  timingSignal: TimingSignal
  timingLabel: string
  estimatedTicket: number
  isRecurrentOpportunity: boolean
  isGameAdaptation: boolean
}

export interface BundleRecommendation {
  template: MediaKitTemplate
  bundleId: string
  bundleName: string
  pitchAngle: string
  nextStep: string
}

export function chooseTemplateForLead(lead: BundleRecommendationLead): MediaKitTemplate {
  if (lead.isGameAdaptation) {
    return 'completo'
  }

  return lead.targetChannel === 'main' ? 'games' : 'streaming'
}

export function suggestBundleIdForLead(lead: BundleRecommendationLead): string {
  if (lead.targetChannel === 'main') {
    if (lead.isRecurrentOpportunity) return 'mensal_games'
    if (lead.niche === 'aaa' && lead.timingSignal === 'launch_30d') return 'gaming_launch'
    if (lead.niche === 'indie' && lead.timingSignal === 'launch_30d') return lead.estimatedTicket < 15000 ? 'starter_games' : 'gaming_launch'
    if (lead.niche === 'mobile') return 'mobile_game'
    if (lead.niche === 'plataforma_gaming') return 'plataforma_gaming'
    if (lead.niche === 'energetico_snack') return 'energetico_snack'
    return 'starter_games'
  }

  if (lead.isGameAdaptation) return 'cross_canal'
  if ((lead.niche === 'anime' || lead.niche === 'streaming') && lead.timingSignal === 'season_launch') return 'anime_season'
  if ((lead.niche === 'anime' || lead.niche === 'streaming') && lead.timingSignal === 'launch_30d') return 'streaming_launch'
  if (lead.isRecurrentOpportunity) return 'mensal_streaming'
  return 'starter_streaming'
}

export function resolveBundleRecommendation({
  lead,
  mediaKit,
  matchedTopicsText,
}: {
  lead: BundleRecommendationLead
  mediaKit: MediaKitData
  matchedTopicsText: string
}): BundleRecommendation {
  const template = chooseTemplateForLead(lead)
  const bundleId = suggestBundleIdForLead(lead)
  const bundle = mediaKit.pricing.bundles.find((item) => item.id === bundleId) ?? mediaKit.pricing.bundles[0]
  const bundleName = bundle?.name ?? 'Starter'
  const angle =
    lead.targetChannel === 'main'
      ? `Abrir com o bundle "${bundleName}" e vender ${matchedTopicsText} em shorts com foco em ${lead.timingLabel.toLowerCase()}.`
      : `Abrir com o bundle "${bundleName}" e vender react curto em cima de ${matchedTopicsText} para ${lead.timingLabel.toLowerCase()}.`
  const nextStep = `Enviar media kit ${template} e proposta enxuta do bundle "${bundleName}" citando ${nicheLabels[lead.niche].toLowerCase()} e ${matchedTopicsText}.`

  return {
    template,
    bundleId,
    bundleName,
    pitchAngle: angle,
    nextStep,
  }
}
