import type { MediaKitData, MediaKitTemplate } from '@/modules/media-kit/data/mediakit.schema'
import {
  MetricPill,
  SlideShell,
  TagList,
  formatCompactNumber,
  getNicheLabel,
  getTemplateLabel,
} from '@/modules/media-kit/components/slides/shared'

export function ChannelsSlide({
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
      title="Canais comerciais"
      subtitle="Snapshot do inventario que pode ser ativado por campanha."
      compact={compact}
    >
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">{data.commercialChannels.main.label}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MetricPill
              label="YouTube"
              value={formatCompactNumber(data.commercialChannels.main.youtube.subscribers)}
              compact={compact}
            />
            <MetricPill
              label="TikTok"
              value={formatCompactNumber(data.commercialChannels.main.tiktok.followers)}
              compact={compact}
            />
            <MetricPill
              label="Views/mes"
              value={formatCompactNumber(data.commercialChannels.main.youtube.monthlyViews)}
              compact={compact}
            />
          </div>
          <div className="mt-5">
            <TagList items={data.commercialChannels.main.acceptedNiches.map(getNicheLabel)} />
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">{data.commercialChannels.react.label}</p>
          <div className="mt-4 grid gap-3">
            <MetricPill
              label="TikTok react"
              value={formatCompactNumber(data.commercialChannels.react.tiktok.followers)}
              compact={compact}
            />
            <MetricPill
              label="Media por react"
              value={formatCompactNumber(data.commercialChannels.react.tiktok.shortsPerformance.avgViews)}
              compact={compact}
            />
          </div>
          <div className="mt-5">
            <TagList items={data.commercialChannels.react.acceptedNiches.map(getNicheLabel)} />
          </div>
        </div>
      </div>
    </SlideShell>
  )
}

