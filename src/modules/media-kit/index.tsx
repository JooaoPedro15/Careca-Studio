import { useEffect, useMemo, useState } from 'react'

import { MEDIA_KIT_SLIDES } from '@/modules/media-kit/data/mediakit.schema'
import type {
  MediaKitData,
  MediaKitSlideId,
  MediaKitTemplate,
  MediaKitTemplateDefinition,
  SlideScreenId,
} from '@/modules/media-kit/data/mediakit.schema'
import { ExternalSlideEditor } from '@/modules/media-kit/components/ExternalSlideEditor'
import { completoTemplate } from '@/modules/media-kit/data/templates/completo.template'
import { gamesTemplate } from '@/modules/media-kit/data/templates/games.template'
import { streamingTemplate } from '@/modules/media-kit/data/templates/streaming.template'
import { MediaKitDashboard } from '@/modules/media-kit/components/MediaKitDashboard'
import { MediaKitEditor } from '@/modules/media-kit/components/MediaKitEditor'
import { MediaKitTemplateManager } from '@/modules/media-kit/components/MediaKitTemplateManager'
import { PptxNativeEditor } from '@/modules/media-kit/components/PptxNativeEditor'
import { exportSlidesAsPdf, exportSlidesAsPng } from '@/modules/media-kit/services/exporter.service'
import {
  getDefaultMediaKitData,
  loadMediaKitData,
  resetMediaKitData,
  saveMediaKitData,
} from '@/modules/media-kit/services/storage.service'
import { simulateMetricSync } from '@/modules/media-kit/services/youtube-api.service'

const templateDefinitions: MediaKitTemplateDefinition[] = [completoTemplate, gamesTemplate, streamingTemplate]

export function MediaKitModule() {
  const [data, setData] = useState<MediaKitData>(() => loadMediaKitData())
  const [screen, setScreen] = useState<SlideScreenId>('dashboard')
  const [activeSlideId, setActiveSlideId] = useState<MediaKitSlideId>('cover')
  const [isSyncing, setIsSyncing] = useState(false)

  const activeTemplate = data.meta.activeTemplate
  const templateDefinition = templateDefinitions.find((item) => item.id === activeTemplate) ?? completoTemplate
  const availableSlides = useMemo(() => {
    const allowed = new Set(templateDefinition.includedSlides)
    return MEDIA_KIT_SLIDES.filter((slide) => allowed.has(slide.id))
  }, [templateDefinition])

  useEffect(() => {
    saveMediaKitData(data)
  }, [data])

  function updateData(updater: (current: MediaKitData) => MediaKitData) {
    setData((current) => updater(current))
  }

  function handleSetTemplate(template: MediaKitTemplate) {
    updateData((current) => ({
      ...current,
      meta: {
        ...current.meta,
        activeTemplate: template,
        lastUpdated: new Date().toISOString(),
      },
    }))
  }

  async function handleSyncMetrics() {
    setIsSyncing(true)

    try {
      const next = await simulateMetricSync(data)
      setData(next)
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleExportPdf() {
    await exportSlidesAsPdf(templateDefinition.includedSlides, data, activeTemplate)
  }

  async function handleExportPng() {
    await exportSlidesAsPng(templateDefinition.includedSlides, data, activeTemplate)
  }

  const content = {
    dashboard: (
      <MediaKitDashboard
        data={data}
        template={activeTemplate}
        templateDefinition={templateDefinition}
        slides={templateDefinition.includedSlides}
        isSyncing={isSyncing}
        onSetTemplate={handleSetTemplate}
        onEditSlide={(slideId) => {
          setActiveSlideId(slideId)
          setScreen('editor')
        }}
        onOpenExternalSlide={() => setScreen('external')}
        onOpenPptx={() => setScreen('pptx')}
        onOpenTemplates={() => setScreen('templates')}
        onExportPdf={handleExportPdf}
        onExportPng={handleExportPng}
        onSyncMetrics={handleSyncMetrics}
      />
    ),
    editor: (
      <MediaKitEditor
        data={data}
        template={activeTemplate}
        slides={availableSlides}
        activeSlideId={activeSlideId}
        onBack={() => setScreen('dashboard')}
        onReset={() => {
          setData(resetMediaKitData())
          setActiveSlideId('cover')
        }}
        onSetActiveSlide={setActiveSlideId}
        onChange={updateData}
      />
    ),
    templates: (
      <MediaKitTemplateManager
        templates={templateDefinitions}
        activeTemplate={activeTemplate}
        onBack={() => setScreen('dashboard')}
        onSelect={(template) => {
          handleSetTemplate(template)
          setScreen('dashboard')
        }}
      />
    ),
    external: (
      <ExternalSlideEditor
        data={data}
        onBack={() => setScreen('dashboard')}
        onChange={updateData}
        onReset={() => {
          const defaults = getDefaultMediaKitData()
          updateData((current) => ({
            ...current,
            externalSlide: defaults.externalSlide,
          }))
        }}
      />
    ),
    pptx: (
      <PptxNativeEditor
        data={data}
        onBack={() => setScreen('dashboard')}
        onChange={updateData}
      />
    ),
  }[screen]

  return <div className="min-h-0">{content}</div>
}
