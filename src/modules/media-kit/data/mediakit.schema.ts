export type MediaKitTemplate = 'completo' | 'games' | 'streaming'
export type CommercialChannel = 'main' | 'react'
export type BundleChannel = CommercialChannel | 'main+react'
export type AcceptedNiche =
  | 'aaa'
  | 'indie'
  | 'mobile'
  | 'plataforma_gaming'
  | 'energetico_snack'
  | 'streaming'
  | 'anime'
  | 'plataforma_video'

export type MediaKitSlideId =
  | 'cover'
  | 'about'
  | 'audience'
  | 'channels'
  | 'performance'
  | 'cases'
  | 'pricing'
  | 'contact'

export type FieldSource = 'auto' | 'manual' | 'integrated'
export type SlideScreenId = 'dashboard' | 'editor' | 'templates' | 'external' | 'pptx'
export type ExternalTextAlign = 'left' | 'center' | 'right'

export interface ExternalSlideTextBlock {
  id: string
  label: string
  text: string
  x: number
  y: number
  width: number
  fontSize: number
  fontWeight: number
  color: string
  align: ExternalTextAlign
}

export interface ExternalMediaKitSlide {
  backgroundImage: string | null
  fileName: string | null
  updatedAt: string | null
  canvas: {
    width: number
    height: number
  }
  blocks: ExternalSlideTextBlock[]
}

export interface NativePptxState {
  filePath: string | null
  lastSyncedAt: string | null
}

export interface ShortsPerformance {
  platform: 'youtube' | 'tiktok'
  avgViews: number
  medianViews: number
  topViews: number
  retentionRate?: number
  avgEngagement?: number
}

export interface ShortHighlight {
  id: string
  title: string
  platform: 'youtube' | 'tiktok'
  views: number
  publishedAt: string
  thumbnailUrl: string
}

export interface AgeRangeStat {
  range: string
  percent: number
}

export interface CountryStat {
  country: string
  percent: number
}

export interface AudienceProfile {
  ageRanges: AgeRangeStat[]
  genderSplit: { male: number; female: number; other: number }
  topCountries: CountryStat[]
  interests: string[]
}

export interface BundleItem {
  id: string
  name: string
  channel: BundleChannel
  items: string[]
  listPrice: number
  bundlePrice: number
  discount: string
  pitch: string
  ticketMedio: string
  estimatedReach?: string
  idealPara: AcceptedNiche[]
}

export interface PricingItem {
  id: string
  name: string
  price: number
  description: string
  channel: CommercialChannel
  isBundle: boolean
  idealFor?: string[]
  underDemand?: boolean
}

export interface MediaKitData {
  meta: {
    version: string
    lastUpdated: string
    activeTemplate: MediaKitTemplate
  }
  creator: {
    displayName: string
    realName: string
    bio: string
    positioning: string
    differentials: string[]
    photoUrl: string
  }
  commercialChannels: {
    main: {
      label: string
      description: string
      youtube: {
        channelId: string
        handle: string
        subscribers: number
        monthlyViews: number
        shortsPerformance: ShortsPerformance
        topShorts: ShortHighlight[]
        lastSyncedAt: string
      }
      tiktok: {
        handle: string
        followers: number
        shortsPerformance: ShortsPerformance
        topShorts: ShortHighlight[]
      }
      instagram?: {
        handle: string
        followers: number
      }
      acceptedNiches: AcceptedNiche[]
    }
    react: {
      label: string
      description: string
      tiktok: {
        handle: string
        followers: number
        shortsPerformance: ShortsPerformance
        topShorts: ShortHighlight[]
      }
      acceptedNiches: AcceptedNiche[]
    }
  }
  combinedShortsReach: {
    main: {
      averagePerPublication: number
      label: string
    }
    react: {
      averagePerPublication: number
      label: string
    }
  }
  audience: {
    main: AudienceProfile
    react: AudienceProfile
  }
  cases: Array<{
    brand: string
    campaign: string
    channel: CommercialChannel
    format: 'short' | 'short_series' | 'bundle' | 'stories' | 'stream'
    results: string
    thumbnailUrl: string
    date: string
  }>
  pricing: {
    lastSyncedAt: string
    disclaimer: string
    items: PricingItem[]
    bundles: BundleItem[]
  }
  contact: {
    email: string
    whatsapp?: string
    manager?: { name: string; email: string }
  }
  externalSlide: ExternalMediaKitSlide
  nativePptx: NativePptxState
}

export interface MediaKitTemplateDefinition {
  id: MediaKitTemplate
  label: string
  description: string
  focus: string
  heroMetric: string
  includedSlides: MediaKitSlideId[]
  defaultChannel: CommercialChannel | 'mixed'
}

export interface SlideDefinition {
  id: MediaKitSlideId
  label: string
  description: string
  source: FieldSource
}

export const MEDIA_KIT_SLIDES: SlideDefinition[] = [
  { id: 'cover', label: 'Capa', description: 'Posicionamento comercial e headline.', source: 'manual' },
  { id: 'about', label: 'Sobre', description: 'Bio curta e diferenciais do creator.', source: 'manual' },
  { id: 'audience', label: 'Audiencia', description: 'Faixa etaria, paises e interesses.', source: 'auto' },
  { id: 'channels', label: 'Canais', description: 'Snapshot de canais e nichos aceitos.', source: 'integrated' },
  {
    id: 'performance',
    label: 'Performance',
    description: 'Slide hero com foco em shorts.',
    source: 'auto',
  },
  { id: 'cases', label: 'Cases', description: 'Resultados por marca e campanha.', source: 'manual' },
  { id: 'pricing', label: 'Precos', description: 'Tabela base, bundles e disclaimer.', source: 'integrated' },
  { id: 'contact', label: 'Contato', description: 'CTA final e canais comerciais.', source: 'manual' },
]
