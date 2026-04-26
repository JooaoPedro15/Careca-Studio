import type { MediaKitData, MediaKitTemplate, ShortHighlight } from '@/modules/media-kit/data/mediakit.schema'
import {
  MetricPill,
  PlaceholderThumb,
  SlideShell,
  formatCompactNumber,
  getTemplateLabel,
} from '@/modules/media-kit/components/slides/shared'

function pickHighlights(data: MediaKitData, template: MediaKitTemplate): ShortHighlight[] {
  if (template === 'streaming') {
    return data.commercialChannels.react.tiktok.topShorts
  }

  return [...data.commercialChannels.main.youtube.topShorts, ...data.commercialChannels.main.tiktok.topShorts]
    .sort((left, right) => right.views - left.views)
    .slice(0, 3)
}

export function PerformanceSlide({
  data,
  template,
  compact,
}: {
  data: MediaKitData
  template: MediaKitTemplate
  compact?: boolean
}) {
  const heroLabel = template === 'streaming' ? data.combinedShortsReach.react.label : data.combinedShortsReach.main.label
  const highlights = pickHighlights(data, template)

  return (
    <SlideShell
      eyebrow={getTemplateLabel(template)}
      title="Performance"
      subtitle="Shorts sao o produto hero. Video longo fica fora do pitch principal."
      compact={compact}
    >
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Headline comercial</p>
          <p className={compact ? 'mt-3 text-2xl font-semibold text-text-primary' : 'mt-4 text-5xl font-semibold text-text-primary'}>
            {heroLabel}
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MetricPill
              label="YT Shorts"
              value={formatCompactNumber(data.commercialChannels.main.youtube.shortsPerformance.avgViews)}
              compact={compact}
            />
            <MetricPill
              label="TikTok games"
              value={formatCompactNumber(data.commercialChannels.main.tiktok.shortsPerformance.avgViews)}
              compact={compact}
            />
            <MetricPill
              label="React TikTok"
              value={formatCompactNumber(data.commercialChannels.react.tiktok.shortsPerformance.avgViews)}
              compact={compact}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Top 3 dos ultimos 90 dias</p>
          <div className="mt-4 grid gap-3">
            {highlights.map((item) => (
              <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3">
                <PlaceholderThumb label={item.title} meta={item.platform} compact={compact} />
                <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Views</p>
                  <p className="mt-2 text-xl font-semibold text-text-primary">{formatCompactNumber(item.views)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideShell>
  )
}

