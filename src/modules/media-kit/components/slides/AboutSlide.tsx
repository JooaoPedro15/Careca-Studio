import type { MediaKitData, MediaKitTemplate } from '@/modules/media-kit/data/mediakit.schema'
import { getNicheLabel, getTemplateLabel, SlideShell, TagList } from '@/modules/media-kit/components/slides/shared'

export function AboutSlide({
  data,
  template,
  compact,
}: {
  data: MediaKitData
  template: MediaKitTemplate
  compact?: boolean
}) {
  return (
    <SlideShell
      eyebrow={getTemplateLabel(template)}
      title="Sobre o creator"
      subtitle="Posicionamento, narrativa comercial e nichos aceitos por canal."
      compact={compact}
    >
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
          <p className={compact ? 'text-sm leading-6 text-text-secondary' : 'text-lg leading-8 text-text-primary'}>
            {data.creator.bio}
          </p>
          <div className="mt-5 space-y-3">
            {data.creator.differentials.map((item) => (
              <div key={item} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Canal games</p>
            <p className="mt-3 text-sm text-text-secondary">{data.commercialChannels.main.description}</p>
            <div className="mt-4">
              <TagList items={data.commercialChannels.main.acceptedNiches.map(getNicheLabel)} />
            </div>
          </div>
          <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Canal react</p>
            <p className="mt-3 text-sm text-text-secondary">{data.commercialChannels.react.description}</p>
            <div className="mt-4">
              <TagList items={data.commercialChannels.react.acceptedNiches.map(getNicheLabel)} />
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  )
}

