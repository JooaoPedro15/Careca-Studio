import Store from 'electron-store'

import type { PartnerBrand } from '../../src/modules/partner-scout-v2/data/partner-database.types.js'
import type {
  PartnerEnrichmentCache,
  PartnerEnrichmentCacheEntry,
} from './partner-scout-agent.js'
import { addPartner as validatePartner } from './partner-scout-agent.js'

interface PartnerScoutStoreSchema {
  partners: Record<string, PartnerBrand>
  enrichments: Record<string, PartnerEnrichmentCacheEntry>
}

export interface PartnerScoutStore extends PartnerEnrichmentCache {
  listPartners: () => PartnerBrand[]
  addPartner: (brand: PartnerBrand, existingBrands?: PartnerBrand[]) => PartnerBrand
  clear: () => void
}

export interface CreatePartnerScoutStoreOptions {
  cwd?: string
  name?: string
}

export function createPartnerScoutStore(options: CreatePartnerScoutStoreOptions = {}): PartnerScoutStore {
  const store = new Store<PartnerScoutStoreSchema>({
    name: options.name ?? 'partner-scout-local',
    cwd: options.cwd,
    defaults: { partners: {}, enrichments: {} },
  })

  const getPartners = (): Record<string, PartnerBrand> => store.get('partners')
  const setPartners = (partners: Record<string, PartnerBrand>) => store.set('partners', partners)
  const getEnrichments = (): Record<string, PartnerEnrichmentCacheEntry> => store.get('enrichments')
  const setEnrichments = (entries: Record<string, PartnerEnrichmentCacheEntry>) => store.set('enrichments', entries)

  return {
    listPartners() {
      return Object.values(getPartners()).sort((a, b) => a.nome.localeCompare(b.nome))
    },

    addPartner(brand, existingBrands = []) {
      const partners = { ...getPartners() }
      const normalized = validatePartner(brand, [...existingBrands, ...Object.values(partners)])
      partners[normalized.id] = normalized
      setPartners(partners)
      return normalized
    },

    get(brandId) {
      return getEnrichments()[brandId] ?? null
    },

    set(brandId, entry) {
      const enrichments = { ...getEnrichments(), [brandId]: entry }
      setEnrichments(enrichments)
    },

    clear() {
      setPartners({})
      setEnrichments({})
    },
  }
}
