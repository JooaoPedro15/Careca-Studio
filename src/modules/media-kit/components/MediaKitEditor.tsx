import type { ReactNode } from 'react'
import { ArrowLeft, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type {
  MediaKitData,
  MediaKitSlideId,
  MediaKitTemplate,
  SlideDefinition,
} from '@/modules/media-kit/data/mediakit.schema'
import { FieldInput } from '@/modules/media-kit/components/FieldInput'
import { SlidePreview } from '@/modules/media-kit/components/SlidePreview'
import { getFieldSourceBadge } from '@/modules/media-kit/components/slides/shared'

interface MediaKitEditorProps {
  data: MediaKitData
  template: MediaKitTemplate
  slides: SlideDefinition[]
  activeSlideId: MediaKitSlideId
  onBack: () => void
  onReset: () => void
  onSetActiveSlide: (slideId: MediaKitSlideId) => void
  onChange: (updater: (current: MediaKitData) => MediaKitData) => void
}

function linesToArray(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function MediaKitEditor({
  data,
  template,
  slides,
  activeSlideId,
  onBack,
  onReset,
  onSetActiveSlide,
  onChange,
}: MediaKitEditorProps) {
  const activeSlide = slides.find((slide) => slide.id === activeSlideId) ?? slides[0]
  const activeBadge = activeSlide ? getFieldSourceBadge(activeSlide.source) : null

  const editorBySlide: Record<MediaKitSlideId, ReactNode> = {
    cover: (
      <div className="space-y-4">
        <FieldInput
          label="Nome exibido"
          value={data.creator.displayName}
          onChange={(value) => onChange((current) => ({ ...current, creator: { ...current.creator, displayName: value } }))}
        />
        <FieldInput
          label="Posicionamento"
          type="textarea"
          value={data.creator.positioning}
          onChange={(value) => onChange((current) => ({ ...current, creator: { ...current.creator, positioning: value } }))}
        />
        <FieldInput
          label="Diferenciais"
          type="tags"
          value={data.creator.differentials.join('\n')}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              creator: { ...current.creator, differentials: linesToArray(value) },
            }))
          }
        />
      </div>
    ),
    about: (
      <div className="space-y-4">
        <FieldInput
          label="Bio comercial"
          type="textarea"
          value={data.creator.bio}
          onChange={(value) => onChange((current) => ({ ...current, creator: { ...current.creator, bio: value } }))}
        />
        <FieldInput
          label="Descricao games"
          type="textarea"
          value={data.commercialChannels.main.description}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              commercialChannels: {
                ...current.commercialChannels,
                main: { ...current.commercialChannels.main, description: value },
              },
            }))
          }
        />
        <FieldInput
          label="Descricao react"
          type="textarea"
          value={data.commercialChannels.react.description}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              commercialChannels: {
                ...current.commercialChannels,
                react: { ...current.commercialChannels.react, description: value },
              },
            }))
          }
        />
      </div>
    ),
    audience: (
      <div className="space-y-4">
        <FieldInput
          label="Interesses games"
          type="tags"
          value={data.audience.main.interests.join('\n')}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              audience: {
                ...current.audience,
                main: { ...current.audience.main, interests: linesToArray(value) },
              },
            }))
          }
        />
        <FieldInput
          label="Interesses react"
          type="tags"
          value={data.audience.react.interests.join('\n')}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              audience: {
                ...current.audience,
                react: { ...current.audience.react, interests: linesToArray(value) },
              },
            }))
          }
        />
      </div>
    ),
    channels: (
      <div className="space-y-4">
        <FieldInput
          label="Handle YouTube"
          value={data.commercialChannels.main.youtube.handle}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              commercialChannels: {
                ...current.commercialChannels,
                main: {
                  ...current.commercialChannels.main,
                  youtube: { ...current.commercialChannels.main.youtube, handle: value },
                },
              },
            }))
          }
        />
        <FieldInput
          label="Inscritos YouTube"
          type="number"
          value={data.commercialChannels.main.youtube.subscribers}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              commercialChannels: {
                ...current.commercialChannels,
                main: {
                  ...current.commercialChannels.main,
                  youtube: { ...current.commercialChannels.main.youtube, subscribers: Number(value) },
                },
              },
            }))
          }
        />
        <FieldInput
          label="Seguidores TikTok react"
          type="number"
          value={data.commercialChannels.react.tiktok.followers}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              commercialChannels: {
                ...current.commercialChannels,
                react: {
                  ...current.commercialChannels.react,
                  tiktok: { ...current.commercialChannels.react.tiktok, followers: Number(value) },
                },
              },
            }))
          }
        />
      </div>
    ),
    performance: (
      <div className="space-y-4">
        <FieldInput
          label="Label hero games"
          value={data.combinedShortsReach.main.label}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              combinedShortsReach: {
                ...current.combinedShortsReach,
                main: { ...current.combinedShortsReach.main, label: value },
              },
            }))
          }
        />
        <FieldInput
          label="Media combinada games"
          type="number"
          value={data.combinedShortsReach.main.averagePerPublication}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              combinedShortsReach: {
                ...current.combinedShortsReach,
                main: { ...current.combinedShortsReach.main, averagePerPublication: Number(value) },
              },
            }))
          }
        />
        <FieldInput
          label="Media combinada react"
          type="number"
          value={data.combinedShortsReach.react.averagePerPublication}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              combinedShortsReach: {
                ...current.combinedShortsReach,
                react: { ...current.combinedShortsReach.react, averagePerPublication: Number(value) },
              },
            }))
          }
        />
      </div>
    ),
    cases: (
      <div className="space-y-4">
        <FieldInput
          label="Case 1 resultado"
          type="textarea"
          value={data.cases[0]?.results ?? ''}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              cases: current.cases.map((item, index) => (index === 0 ? { ...item, results: value } : item)),
            }))
          }
        />
        <FieldInput
          label="Case 2 resultado"
          type="textarea"
          value={data.cases[1]?.results ?? ''}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              cases: current.cases.map((item, index) => (index === 1 ? { ...item, results: value } : item)),
            }))
          }
        />
      </div>
    ),
    pricing: (
      <div className="space-y-4">
        <FieldInput
          label="Disclaimer"
          type="textarea"
          value={data.pricing.disclaimer}
          onChange={(value) => onChange((current) => ({ ...current, pricing: { ...current.pricing, disclaimer: value } }))}
        />
        <FieldInput
          label="Bundle mensal games"
          type="number"
          value={data.pricing.bundles.find((item) => item.id === 'mensal_games')?.bundlePrice ?? 32000}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              pricing: {
                ...current.pricing,
                bundles: current.pricing.bundles.map((bundle) =>
                  bundle.id === 'mensal_games' ? { ...bundle, bundlePrice: Number(value) } : bundle,
                ),
              },
            }))
          }
        />
        <FieldInput
          label="Bundle streaming launch"
          type="number"
          value={data.pricing.bundles.find((item) => item.id === 'streaming_launch')?.bundlePrice ?? 11500}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              pricing: {
                ...current.pricing,
                bundles: current.pricing.bundles.map((bundle) =>
                  bundle.id === 'streaming_launch' ? { ...bundle, bundlePrice: Number(value) } : bundle,
                ),
              },
            }))
          }
        />
      </div>
    ),
    contact: (
      <div className="space-y-4">
        <FieldInput
          label="Email"
          value={data.contact.email}
          onChange={(value) => onChange((current) => ({ ...current, contact: { ...current.contact, email: value } }))}
        />
        <FieldInput
          label="WhatsApp"
          value={data.contact.whatsapp ?? ''}
          onChange={(value) => onChange((current) => ({ ...current, contact: { ...current.contact, whatsapp: value } }))}
        />
        <FieldInput
          label="Manager"
          value={data.contact.manager?.name ?? ''}
          onChange={(value) =>
            onChange((current) => ({
              ...current,
              contact: {
                ...current.contact,
                manager: { name: value, email: current.contact.manager?.email ?? current.contact.email },
              },
            }))
          }
        />
      </div>
    ),
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button leadingIcon={<ArrowLeft className="h-4 w-4" />} variant="ghost" onClick={onBack}>
          Voltar ao dashboard
        </Button>
        <Button leadingIcon={<RotateCcw className="h-4 w-4" />} variant="ghost" onClick={onReset}>
          Restaurar defaults
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="space-y-4">
          <div className="space-y-2">
            {slides.map((slide) => {
              const badge = getFieldSourceBadge(slide.source)
              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => onSetActiveSlide(slide.id)}
                  className={
                    slide.id === activeSlideId
                      ? 'w-full rounded-2xl border border-white/18 bg-white/8 px-4 py-3 text-left'
                      : 'w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:bg-white/7'
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-text-primary">{slide.label}</p>
                    <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">{badge.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">{slide.description}</p>
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Indicador do slide</p>
            <p className="mt-2 text-sm text-text-primary">{activeBadge?.label ?? 'Manual'}</p>
          </div>

          {editorBySlide[activeSlideId]}
        </Card>

        <Card className="overflow-hidden p-4">
          <SlidePreview slideId={activeSlideId} data={data} template={template} />
        </Card>
      </div>
    </div>
  )
}
