import type { MediaKitData, MediaKitTemplate } from '@/modules/media-kit/data/mediakit.schema'
import {
  SlideShell,
  formatCurrency,
  getTemplateLabel,
} from '@/modules/media-kit/components/slides/shared'
import { getPricingSnapshot } from '@/modules/media-kit/services/publi-pricer.bridge'

export function PricingSlide({
  data,
  template,
  compact,
}: {
  data: MediaKitData
  template: MediaKitTemplate
  compact?: boolean
}) {
  const pricing = getPricingSnapshot(data, template)
  const featured = pricing.bundles.find((bundle) => bundle.id === pricing.highlightedBundleId) ?? pricing.bundles[0]

  return (
    <SlideShell
      eyebrow={getTemplateLabel(template)}
      title="Precos e bundles"
      subtitle="Pacotes orientados por timing, recorrencia e alcance em shorts."
      compact={compact}
      footer={<p className="text-xs leading-6 text-text-secondary">{pricing.disclaimer}</p>}
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        {featured ? (
          <div className="rounded-3xl border border-white/8 bg-[linear-gradient(135deg,rgba(138,180,255,0.16),rgba(255,255,255,0.02))] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Bundle destaque</p>
            <h4 className={compact ? 'mt-3 text-2xl font-semibold text-text-primary' : 'mt-3 text-3xl font-semibold text-text-primary'}>
              {featured.name}
            </h4>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">{featured.pitch}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/18 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Bundle</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{formatCurrency(featured.bundlePrice)}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/18 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Alcance estimado</p>
                <p className="mt-2 text-2xl font-semibold text-text-primary">{featured.estimatedReach ?? featured.ticketMedio}</p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {featured.items.map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-text-primary">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Outros bundles</p>
            <div className="mt-4 space-y-3">
              {pricing.bundles.slice(0, compact ? 2 : 3).map((bundle) => (
                <div key={bundle.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-text-primary">{bundle.name}</p>
                    <p className="text-sm text-text-secondary">{bundle.ticketMedio}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{bundle.pitch}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Tabela base</p>
            <div className="mt-4 space-y-3">
              {pricing.items.slice(0, compact ? 3 : 4).map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.name}</p>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">{item.description}</p>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    {item.underDemand ? 'Sob consulta' : formatCurrency(item.price)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  )
}

