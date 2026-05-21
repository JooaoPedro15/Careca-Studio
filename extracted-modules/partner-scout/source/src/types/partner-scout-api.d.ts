import type { ContatoMarca } from '../modules/partner-scout/agent/schema'
import type { ProspectionRun, RunProgressEvent } from '../modules/partner-scout/agent/run'
import type { BrandCacheEntry, BrandStatus } from '../modules/partner-scout/data/brand-cache.types'
import type {
  PartnerAiStatus,
  PartnerBrand,
  PartnerEnrichmentResult,
  PartnerSearchFilters,
} from '../modules/partner-scout/data/partner-database.types'

declare global {
  interface Window {
    careca: {
      partnerScout: {
        run: () => Promise<{ runId: string }>
        abort: () => Promise<{ ok: boolean }>
        onProgress: (cb: (event: RunProgressEvent) => void) => () => void
        onDone: (cb: (run: ProspectionRun) => void) => () => void
        onError: (cb: (payload: { runId: string; error: string }) => void) => () => void
        onAiStatus: (cb: (status: PartnerAiStatus) => void) => () => void
        listRuns: () => Promise<ProspectionRun[]>
        getRun: (id: string) => Promise<ProspectionRun | null>
        deleteRun: (id: string) => Promise<{ ok: boolean }>
        searchPartners: (filters: PartnerSearchFilters) => Promise<PartnerBrand[]>
        addPartner: (brandData: PartnerBrand) => Promise<PartnerBrand>
        enrichPartner: (brandId: string) => Promise<PartnerEnrichmentResult>
        listCache: () => Promise<BrandCacheEntry[]>
        setBrandStatus: (normalizedName: string, status: BrandStatus, note?: string) => Promise<BrandCacheEntry>
        updateBrandContact: (normalizedName: string, patch: Partial<ContatoMarca>) => Promise<BrandCacheEntry>
        addBrandNote: (normalizedName: string, text: string) => Promise<BrandCacheEntry>
        getApiKeyStatus: () => Promise<{ configured: boolean; source: string; masked?: string }>
        getAiStatus: () => Promise<PartnerAiStatus>
        getCreatorProfile: () => Promise<unknown>
        openMarkdownFolder: () => Promise<string>
        openMarkdownFile: (path: string) => Promise<string>
        fetchOfficialYoutubeSignals: () => Promise<
          Array<{
            brand: string
            publishedAt: string
            title: string
            url: string
            evidence: string
            keywords: string[]
          }>
        >
      }
    }
  }
}

export {}
