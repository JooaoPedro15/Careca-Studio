import { Download, FileImage, FilePenLine, ImagePlus, PencilLine, RefreshCw, SwatchBook } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { ExternalSlidePreview } from '@/modules/media-kit/components/ExternalSlidePreview'
import type {
  MediaKitData,
  MediaKitSlideId,
  MediaKitTemplate,
  MediaKitTemplateDefinition,
} from '@/modules/media-kit/data/mediakit.schema'
import { SlidePreview } from '@/modules/media-kit/components/SlidePreview'
import {
  formatCompactNumber,
  formatRelativeDays,
  getTemplateLabel,
} from '@/modules/media-kit/components/slides/shared'

interface MediaKitDashboardProps {
  data: MediaKitData
  template: MediaKitTemplate
  templateDefinition: MediaKitTemplateDefinition
  slides: MediaKitSlideId[]
  isSyncing: boolean
  onSetTemplate: (template: MediaKitTemplate) => void
  onEditSlide: (slideId: MediaKitSlideId) => void
  onOpenExternalSlide: () => void
  onOpenPptx: () => void
  onOpenTemplates: () => void
  onExportPdf: () => void
  onExportPng: () => void
  onSyncMetrics: () => void
}

const templateOptions: Array<{ label: string; value: MediaKitTemplate }> = [
  { label: 'Kit completo', value: 'completo' },
  { label: 'Kit games', value: 'games' },
  { label: 'Kit streaming/anime', value: 'streaming' },
]

export function MediaKitDashboard({
  data,
  template,
  templateDefinition,
  slides,
  isSyncing,
  onSetTemplate,
  onEditSlide,
  onOpenExternalSlide,
  onOpenPptx,
  onOpenTemplates,
  onExportPdf,
  onExportPng,
  onSyncMetrics,
}: MediaKitDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(138,180,255,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.3em] text-text-muted">{getTemplateLabel(template)}</p>
              <h3 className="mt-3 text-3xl font-semibold text-text-primary">Dashboard do Media Kit</h3>
              <p className="mt-3 text-sm leading-7 text-text-secondary">{templateDefinition.focus}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button leadingIcon={<PencilLine className="h-4 w-4" />} variant="ghost" onClick={() => onEditSlide(slides[0] ?? 'cover')}>
                Editar slide
              </Button>
              <Button leadingIcon={<ImagePlus className="h-4 w-4" />} variant="ghost" onClick={onOpenExternalSlide}>
                Slide externo
              </Button>
              <Button leadingIcon={<FilePenLine className="h-4 w-4" />} variant="ghost" onClick={onOpenPptx}>
                PPTX nativo
              </Button>
              <Button leadingIcon={<Download className="h-4 w-4" />} onClick={onExportPdf}>
                Exportar PDF
              </Button>
              <Button leadingIcon={<FileImage className="h-4 w-4" />} variant="ghost" onClick={onExportPng}>
                Exportar PNGs
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {templateOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSetTemplate(option.value)}
                className={
                  option.value === template
                    ? 'rounded-full border border-white/20 bg-white/12 px-4 py-2 text-sm text-white'
                    : 'rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm text-text-secondary transition hover:bg-white/8 hover:text-white'
                }
              >
                {option.label}
              </button>
            ))}
            <Button leadingIcon={<SwatchBook className="h-4 w-4" />} variant="ghost" onClick={onOpenTemplates}>
              Gerenciar templates
            </Button>
          </div>
        </Card>

        <Card>
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Ultima atualizacao</p>
              <p className="mt-2 text-2xl font-semibold text-text-primary">{formatRelativeDays(data.meta.lastUpdated)}</p>
              <p className="mt-2 text-sm text-text-secondary">
                Ultima sincronizacao do canal principal: {formatRelativeDays(data.commercialChannels.main.youtube.lastSyncedAt)}
              </p>
            </div>
            <Button
              leadingIcon={<RefreshCw className={isSyncing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />}
              variant="ghost"
              onClick={onSyncMetrics}
              disabled={isSyncing}
            >
              Sincronizar metricas agora
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="YouTube Shorts" value={formatCompactNumber(data.commercialChannels.main.youtube.shortsPerformance.avgViews)} hint="media por short" />
        <StatCard label="TikTok games" value={formatCompactNumber(data.commercialChannels.main.tiktok.shortsPerformance.avgViews)} hint="media por publicacao" />
        <StatCard label="React TikTok" value={formatCompactNumber(data.commercialChannels.react.tiktok.shortsPerformance.avgViews)} hint="media por react" />
        <StatCard label="Views hero" value={templateDefinition.heroMetric} hint="metricas usadas no pitch" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {slides.map((slideId) => (
          <Card key={slideId} className="overflow-hidden p-3">
            <div className="space-y-3">
              <SlidePreview slideId={slideId} data={data} template={template} compact />
              <Button variant="ghost" onClick={() => onEditSlide(slideId)}>
                Editar slide
              </Button>
            </div>
          </Card>
        ))}

        <Card className="overflow-hidden p-3">
          <div className="space-y-3">
            <ExternalSlidePreview slide={data.externalSlide} compact />
            <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
              <p className="text-sm font-medium text-text-primary">Slide externo importado</p>
              <p className="mt-2 text-sm text-text-secondary">
                {data.externalSlide.fileName ?? 'Nenhuma arte importada ainda. Traga um slide pronto e edite os blocos por dentro.'}
              </p>
            </div>
            <Button variant="ghost" onClick={onOpenExternalSlide}>
              Editar slide externo
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden p-3">
          <div className="space-y-3">
            <div className="flex aspect-[4/3] items-center justify-center rounded-[30px] border border-white/8 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]">
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-text-muted">PPTX nativo</p>
                <p className="mt-3 text-sm text-text-secondary">
                  {data.nativePptx.filePath ? 'Arquivo vinculado para edicao real.' : 'Abra um .pptx e edite os textos do arquivo real.'}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
              <p className="text-sm font-medium text-text-primary">Editor de PowerPoint</p>
              <p className="mt-2 text-sm text-text-secondary">
                {data.nativePptx.filePath ?? 'Nenhum arquivo .pptx conectado ainda.'}
              </p>
            </div>
            <Button variant="ghost" onClick={onOpenPptx}>
              Editar PPTX nativo
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
