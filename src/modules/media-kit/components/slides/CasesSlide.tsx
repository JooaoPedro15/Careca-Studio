import type { MediaKitData, MediaKitTemplate } from '@/modules/media-kit/data/mediakit.schema'
import {
  PlaceholderThumb,
  SlideShell,
  getChannelLabel,
  getTemplateLabel,
} from '@/modules/media-kit/components/slides/shared'

export function CasesSlide({
  data,
  template,
  compact,
}: {
  data: MediaKitData
  template: MediaKitTemplate
  compact?: boolean
}) {
  const filteredCases = data.cases.filter((item) => {
    if (template === 'games') {
      return item.channel === 'main'
    }

    if (template === 'streaming') {
      return item.channel === 'react'
    }

    return true
  })

  return (
    <SlideShell
      eyebrow={getTemplateLabel(template)}
      title="Cases"
      subtitle="Provas sociais curtas para copiar e colar em pitch ou deck."
      compact={compact}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {filteredCases.map((item) => (
          <div key={`${item.brand}-${item.date}`} className="rounded-3xl border border-white/8 bg-black/18 p-5">
            <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <PlaceholderThumb label={item.brand} meta={item.campaign} compact={compact} />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-text-muted">{getChannelLabel(item.channel)}</p>
                <p className="mt-3 text-lg font-semibold text-text-primary">{item.results}</p>
                <p className="mt-3 text-sm leading-6 text-text-secondary">{item.campaign}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] text-text-muted">{item.date}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SlideShell>
  )
}

