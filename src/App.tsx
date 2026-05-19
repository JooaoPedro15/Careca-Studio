import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'
import { useClipSplitter } from '@/hooks/useClipSplitter'
import { useSubtitleForge } from '@/hooks/useSubtitleForge'
import { MediaKitModule } from '@/modules/media-kit'
import { PartnerScoutModule } from '@/modules/partner-scout'
import { PartnerScoutModuleV2 } from '@/modules/partner-scout-v2'
import { ClipSplitterPage } from '@/pages/ClipSplitter'
import { SubtitleForgePage } from '@/pages/SubtitleForge'
import { useAppStore } from '@/store/appStore'
import type { ToolId } from '@/types/subtitle'

// TEMPORÁRIO — remover na Task 10 (swap atômico v1→v2)
const SHOW_V2 = true

const pageMeta: Record<ToolId, { title: string; description: string }> = {
  'subtitle-forge': {
    title: 'SubtitleForge',
    description: 'Central de transcricao com fila, presets de legenda e integracao com o pipeline Python local.',
  },
  'clip-splitter': {
    title: 'Clip Splitter',
    description: 'Mesa de corte para quebrar videos longos em clips curtos com regras de tempo e saida.',
  },
  'media-kit': {
    title: 'Media Kit',
    description: 'Editor comercial com dashboard, templates, preview ao vivo e export para deck.',
  },
  'partner-scout': {
    title: 'Partner Scout',
    description: 'Radar de marcas, timing de campanha, scoring de fit e geracao de pitch shorts-first.',
  },
}

export default function App() {
  const activeTool = useAppStore((state) => state.activeTool)
  const setActiveTool = useAppStore((state) => state.setActiveTool)
  const clipSplitter = useClipSplitter()
  const subtitleForge = useSubtitleForge()

  let content
  if (activeTool === 'clip-splitter') {
    content = (
      <ClipSplitterPage
        onCancelTask={clipSplitter.cancelTask}
        onOpenOutput={clipSplitter.openOutput}
        onPickOutputDir={clipSplitter.pickOutputDir}
        onPickSourceFile={clipSplitter.pickSourceFile}
        onRetryTask={clipSplitter.retryTask}
        onSaveClipFeedback={clipSplitter.saveClipFeedback}
        onStartSplit={() => clipSplitter.startSplit()}
      />
    )
  } else if (activeTool === 'media-kit') {
    content = <MediaKitModule />
  } else if (activeTool === 'partner-scout') {
    content = SHOW_V2 ? <PartnerScoutModuleV2 /> : <PartnerScoutModule />
  } else {
    content = (
      <SubtitleForgePage
        onCancelTask={subtitleForge.cancelTask}
        onDropPaths={subtitleForge.queuePaths}
        onOpenOutput={subtitleForge.openOutput}
        onPickFiles={subtitleForge.pickFiles}
        onRetryTask={subtitleForge.retryTask}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#080808_0%,#000000_100%)] px-5 py-5 text-text-primary">
      <div className="grid min-h-[calc(100vh-40px)] gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar activeTool={activeTool} onSelect={setActiveTool} />

        <main className="flex min-h-0 flex-col gap-5">
          <Topbar description={pageMeta[activeTool].description} title={pageMeta[activeTool].title} />
          <section className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/6 bg-white/[0.025] p-5">
            {content}
          </section>
        </main>
      </div>
    </div>
  )
}
