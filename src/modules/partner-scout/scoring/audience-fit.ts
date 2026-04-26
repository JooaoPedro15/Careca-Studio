import type { MediaKitData } from '@/modules/media-kit/data/mediakit.schema'
import type { AcceptedNiche, TargetChannel } from '@/modules/partner-scout/data/niche-filters'

export interface AudienceFitResult {
  score: number
  label: string
  reasoning: string
  matchedTopics: string[]
  audienceDescriptor: string
}

const nicheKeywordMap: Record<AcceptedNiche, string[]> = {
  aaa: ['aaa', 'open world', 'catalogos', 'gameplay', 'memes'],
  indie: ['indie', 'descoberta', 'memes', 'gameplay'],
  mobile: ['mobile', 'rpg', 'gacha', 'conversao'],
  plataforma_gaming: ['catalogos', 'assinatura', 'catalogo', 'cloud'],
  energetico_snack: ['gameplay', 'memes', 'gaming', 'snack', 'energetico'],
  streaming: ['streaming', 'trailers', 'trailers', 'fandoms', 'teorias'],
  anime: ['anime', 'fandoms', 'teorias', 'temporada'],
  plataforma_video: ['streaming', 'trailers', 'franquias', 'fandoms'],
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function dedupeValues(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function sumAge(profile: MediaKitData['audience']['main'], ranges: string[]): number {
  return profile.ageRanges
    .filter((item) => ranges.includes(item.range))
    .reduce((total, item) => total + item.percent, 0)
}

function getAudienceDescriptor(mediaKit: MediaKitData, targetChannel: TargetChannel): string {
  const profile = targetChannel === 'main' ? mediaKit.audience.main : mediaKit.audience.react
  const channelLabel = targetChannel === 'main' ? 'canal games' : 'canal react'
  const youthConcentration = sumAge(profile, ['13-17', '18-24'])
  const interests = profile.interests.slice(0, 3).join(', ')

  return `${channelLabel} com ${youthConcentration}% da audiencia entre 13-24 e interesses em ${interests}`
}

export function calculateAudienceFit({
  niche,
  targetChannel,
  mediaKit,
  keywords = [],
}: {
  niche: AcceptedNiche
  targetChannel: TargetChannel
  mediaKit: MediaKitData
  keywords?: string[]
}): AudienceFitResult {
  const profile = targetChannel === 'main' ? mediaKit.audience.main : mediaKit.audience.react
  const commercialChannel = targetChannel === 'main' ? mediaKit.commercialChannels.main : mediaKit.commercialChannels.react
  const normalizedInterests = profile.interests.map(normalizeText)
  const nicheKeywords = nicheKeywordMap[niche]
  const topShortSignals =
    targetChannel === 'main'
      ? [
          ...mediaKit.commercialChannels.main.youtube.topShorts.map((item) => item.title),
          ...mediaKit.commercialChannels.main.tiktok.topShorts.map((item) => item.title),
        ]
      : mediaKit.commercialChannels.react.tiktok.topShorts.map((item) => item.title)
  const caseSignals = mediaKit.cases
    .filter((item) => item.channel === targetChannel)
    .flatMap((item) => [item.brand, item.campaign, item.results])
  const normalizedContentSignals = [...topShortSignals, ...caseSignals].map(normalizeText)
  const normalizedKeywords = dedupeValues([...nicheKeywords, ...keywords].map(normalizeText))
  const matchedInterestTopics = normalizedKeywords.filter((keyword) =>
    normalizedInterests.some((interest) => interest.includes(keyword) || keyword.includes(interest)),
  )
  const matchedContentTopics = normalizedKeywords.filter((keyword) =>
    normalizedContentSignals.some((signal) => signal.includes(keyword)),
  )
  const matchedTopics = dedupeValues([...matchedInterestTopics, ...matchedContentTopics]).slice(0, 4)

  const acceptedNicheScore = commercialChannel.acceptedNiches.includes(niche) ? 12 : 0
  const interestScore = Math.min(12, matchedInterestTopics.length * 4)
  const contentScore = Math.min(8, matchedContentTopics.length * 4)
  const bundleScore = mediaKit.pricing.bundles.some(
    (bundle) =>
      (bundle.channel === targetChannel || bundle.channel === 'main+react') && bundle.idealPara.includes(niche),
  )
    ? 4
    : 0
  const youthConcentration = sumAge(profile, ['13-17', '18-24'])
  const ageScore = youthConcentration >= 60 ? 6 : youthConcentration >= 45 ? 4 : 2
  const genderScore =
    targetChannel === 'main'
      ? profile.genderSplit.male >= 60
        ? 2
        : 1
      : profile.genderSplit.female >= 50
        ? 2
        : 1

  const score = Math.min(40, acceptedNicheScore + interestScore + contentScore + bundleScore + ageScore + genderScore)
  const audienceDescriptor = getAudienceDescriptor(mediaKit, targetChannel)
  const channelLabel = targetChannel === 'main' ? 'canal games' : 'canal react'
  const topicsSummary = matchedTopics.length > 0 ? matchedTopics.join(', ') : profile.interests.slice(0, 2).join(', ')
  const reasoning =
    bundleScore > 0
      ? `Conecta com ${topicsSummary} que ja aparecem no seu ${channelLabel}. Voce ja tem oferta comercial pronta para esse nicho.`
      : `Conecta com ${topicsSummary} que ja aparecem no seu ${channelLabel}.`

  if (score >= 32) {
    return {
      score,
      label: 'Muito forte no seu publico',
      reasoning,
      matchedTopics,
      audienceDescriptor,
    }
  }

  if (score >= 24) {
    return {
      score,
      label: 'Forte no seu publico',
      reasoning,
      matchedTopics,
      audienceDescriptor,
    }
  }

  if (score >= 16) {
    return {
      score,
      label: 'Fit moderado no seu publico',
      reasoning,
      matchedTopics,
      audienceDescriptor,
    }
  }

  return {
    score,
    label: 'Fit parcial no seu publico',
    reasoning: `O nicho pode funcionar, mas ainda nao conversa com os sinais mais fortes do seu ${channelLabel}.`,
    matchedTopics,
    audienceDescriptor,
  }
}
