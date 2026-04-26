import type { AudienceProfile, MediaKitData, MediaKitTemplate } from '@/modules/media-kit/data/mediakit.schema'
import { BarRow, SlideShell, TagList, getTemplateLabel } from '@/modules/media-kit/components/slides/shared'

function AudienceColumn({
  label,
  profile,
  compact,
}: {
  label: string
  profile: AudienceProfile
  compact?: boolean
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-text-muted">{label}</p>
      <div className="mt-4 space-y-3">
        {profile.ageRanges.map((item) => (
          <BarRow key={item.range} label={item.range} value={item.percent} compact={compact} />
        ))}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-white/4 p-3 text-sm text-text-secondary">
          Masculino
          <p className="mt-1 text-xl font-semibold text-text-primary">{profile.genderSplit.male}%</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/4 p-3 text-sm text-text-secondary">
          Feminino
          <p className="mt-1 text-xl font-semibold text-text-primary">{profile.genderSplit.female}%</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/4 p-3 text-sm text-text-secondary">
          Outro
          <p className="mt-1 text-xl font-semibold text-text-primary">{profile.genderSplit.other}%</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {profile.topCountries.map((item) => (
          <div key={item.country} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
            <span className="text-sm text-text-primary">{item.country}</span>
            <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">{item.percent}%</span>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <TagList items={profile.interests} />
      </div>
    </div>
  )
}

export function AudienceSlide({
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
      title="Audiencia"
      subtitle="Recorte rapido das duas frentes comerciais para mostrar afinidade de nicho."
      compact={compact}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <AudienceColumn label="Games" profile={data.audience.main} compact={compact} />
        <AudienceColumn label="Streaming/anime" profile={data.audience.react} compact={compact} />
      </div>
    </SlideShell>
  )
}

