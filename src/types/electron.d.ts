import type {
  ClipFeedbackLabel,
  ClipSplitterClip,
  ClipSplitterDoneEvent,
  ClipSplitterErrorEvent,
  ClipSplitterOptions,
  ClipSplitterProgressEvent,
} from './clipSplitter'
import type {
  SubtitleDoneEvent,
  SubtitleErrorEvent,
  SubtitleProgressEvent,
  SubtitleTaskOptions,
} from './subtitle'
import type { PptxDeck, PptxTextUpdate } from './pptx'
import type { BrandCacheEntry, BrandStatus } from '../modules/partner-scout-v2/data/brand-cache.types'
import type { ContatoMarca } from '../modules/partner-scout-v2/agent/schema'
import type { ProspectionRun, RunProgressEvent } from '../modules/partner-scout-v2/agent/run'
import type {
  PartnerAiStatus,
  PartnerBrand,
  PartnerEnrichmentResult,
  PartnerSearchFilters,
} from '../modules/partner-scout-v2/data/partner-database.types'

declare global {
  interface Window {
    // API exposta pelo preload para o renderer conversar com o processo principal.
    careca: {
      window: {
        // Controles da janela frameless do Electron.
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        close: () => Promise<void>
      }
      dialog: {
        // Dialogos nativos usados para selecionar arquivos e diretorios.
        openFiles: (filters: { name: string; extensions: string[] }[]) => Promise<string[]>
        openDirectory: () => Promise<string | null>
        getPathForFile: (file: File) => string
      }
      shell: {
        // Acoes de sistema operacional expostas de forma segura para a UI.
        showItemInFolder: (filePath: string) => Promise<void>
        openPath: (filePath: string) => Promise<string>
      }
      subtitle: {
        // Ponte entre o renderer e a fila de transcricao do Electron.
        process: (filePath: string, options: Partial<SubtitleTaskOptions>) => Promise<string>
        cancel: (taskId: string) => Promise<boolean>
        onProgress: (cb: (data: SubtitleProgressEvent) => void) => () => void
        onDone: (cb: (data: SubtitleDoneEvent) => void) => () => void
        onError: (cb: (data: SubtitleErrorEvent) => void) => () => void
      }
      clipSplitter: {
        // Ponte entre o renderer e o pipeline de corte/exportacao.
        process: (sourcePath: string, options: Partial<ClipSplitterOptions>) => Promise<string>
        cancel: (taskId: string) => Promise<boolean>
        saveFeedback: (clip: ClipSplitterClip, label: ClipFeedbackLabel | null) => Promise<boolean>
        onProgress: (cb: (data: ClipSplitterProgressEvent) => void) => () => void
        onDone: (cb: (data: ClipSplitterDoneEvent) => void) => () => void
        onError: (cb: (data: ClipSplitterErrorEvent) => void) => () => void
      }
      partnerScout: {
        // V2 (LLM agent)
        run: () => Promise<{ runId: string }>
        abort: () => Promise<{ ok: boolean }>
        onProgress: (cb: (e: RunProgressEvent) => void) => () => void
        onDone: (cb: (run: ProspectionRun) => void) => () => void
        onError: (cb: (p: { runId: string; error: string }) => void) => () => void
        onAiStatus: (cb: (status: PartnerAiStatus) => void) => () => void
        listRuns: () => Promise<ProspectionRun[]>
        getRun: (id: string) => Promise<ProspectionRun | null>
        deleteRun: (id: string) => Promise<{ ok: boolean }>
        searchPartners: (filters: PartnerSearchFilters) => Promise<PartnerBrand[]>
        addPartner: (brandData: PartnerBrand) => Promise<PartnerBrand>
        enrichPartner: (brandId: string) => Promise<PartnerEnrichmentResult>
        listCache: () => Promise<BrandCacheEntry[]>
        setBrandStatus: (n: string, s: BrandStatus, nota?: string) => Promise<BrandCacheEntry>
        updateBrandContact: (n: string, patch: Partial<ContatoMarca>) => Promise<BrandCacheEntry>
        addBrandNote: (n: string, text: string) => Promise<BrandCacheEntry>
        getApiKeyStatus: () => Promise<{ configured: boolean; source: string; masked?: string }>
        getAiStatus: () => Promise<PartnerAiStatus>
        getCreatorProfile: () => Promise<unknown>
        openMarkdownFolder: () => Promise<string>
        openMarkdownFile: (path: string) => Promise<string>
        // legacy v1 (a remover na Task 10):
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
      pptx: {
        inspect: (filePath: string) => Promise<PptxDeck>
        updateText: (filePath: string, updates: PptxTextUpdate[]) => Promise<PptxDeck>
      }
    }
  }
}

export {}
