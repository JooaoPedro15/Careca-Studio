import { acceptedNicheList } from '@/modules/partner-scout/data/niche-filters'
import type { AcceptedNiche } from '@/modules/partner-scout/data/niche-filters'

export interface SourceChannel {
  id: string
  name: string
  handle: string
  enabled: boolean
}

export interface SourcesConfig {
  gameChannels: SourceChannel[]
  reactChannels: SourceChannel[]
  frequency: 'daily-6h' | 'every-3-days'
  nicheToggles: Record<AcceptedNiche, boolean>
}

const nicheToggles = acceptedNicheList.reduce<Record<AcceptedNiche, boolean>>((accumulator, niche) => {
  accumulator[niche] = true
  return accumulator
}, {} as Record<AcceptedNiche, boolean>)

export const defaultSourcesConfig: SourcesConfig = {
  gameChannels: [
    { id: 'brksedu', name: 'BRKsEDU', handle: '@brksedu', enabled: true },
    { id: 'davy-jones', name: 'Davy Jones', handle: '@davyjones', enabled: true },
    { id: 'funkyblackcat', name: 'FunkyBlackCat', handle: '@funkyblackcat', enabled: true },
    { id: 'coisa-de-nerd', name: 'Coisa de Nerd', handle: '@coisadenerd', enabled: true },
  ],
  reactChannels: [],
  frequency: 'daily-6h',
  nicheToggles,
}
