import type { MediaKitData, MediaKitTemplate } from '@/modules/media-kit/data/mediakit.schema'
import { MetricPill, SlideShell, getTemplateLabel } from '@/modules/media-kit/components/slides/shared'

export function ContactSlide({
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
      title="Contato"
      subtitle="Fecho simples para deck, pitch e follow-up."
      compact={compact}
    >
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <MetricPill label="Email" value={data.contact.email} compact={compact} />
          {data.contact.whatsapp ? <MetricPill label="WhatsApp" value={data.contact.whatsapp} compact={compact} /> : null}
          {data.contact.manager ? (
            <MetricPill
              label="Responsavel"
              value={`${data.contact.manager.name} · ${data.contact.manager.email}`}
              compact={compact}
            />
          ) : null}
        </div>

        <div className="rounded-3xl border border-white/8 bg-black/18 p-5">
          <p className={compact ? 'text-base leading-7 text-text-primary' : 'text-2xl leading-10 text-text-primary'}>
            Shorts sao o produto hero para campanhas de awareness e timing. Se a marca quiser explorar video longo,
            o formato fica disponivel sob consulta.
          </p>
          <p className="mt-5 text-sm leading-7 text-text-secondary">
            Pitch pronto para anexar o template correto e seguir com proposta de bundle.
          </p>
        </div>
      </div>
    </SlideShell>
  )
}

