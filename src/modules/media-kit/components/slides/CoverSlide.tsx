import type { MediaKitData, MediaKitTemplate } from '@/modules/media-kit/data/mediakit.schema'
import { getTemplateLabel, MetricPill, SlideShell, TagList } from '@/modules/media-kit/components/slides/shared'

export function CoverSlide({
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
      title={data.creator.displayName}
      subtitle={data.creator.positioning}
      compact={compact}
      footer={<TagList items={data.creator.differentials} />}
    >
      <div className={compact ? 'grid gap-3 md:grid-cols-2' : 'grid gap-4 md:grid-cols-3'}>
        <MetricPill label="Games bundle hero" value={data.combinedShortsReach.main.label} compact={compact} />
        <MetricPill label="React timing" value={data.combinedShortsReach.react.label} compact={compact} />
        <MetricPill
          label="Contato rapido"
          value={data.contact.whatsapp ?? data.contact.email}
          compact={compact}
        />
      </div>
      <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
        <p className={compact ? 'text-sm leading-6 text-text-secondary' : 'text-lg leading-8 text-text-primary'}>
          {data.creator.bio}
        </p>
      </div>
    </SlideShell>
  )
}

