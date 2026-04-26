import { Globe, Mail, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { nicheLabels, targetChannelLabels } from '@/modules/partner-scout/data/niche-filters'
import type { GeneratedPitch, Lead } from '@/modules/partner-scout/data/leads.store'

interface LeadDetailProps {
  lead: Lead | null
  pitch: GeneratedPitch | null
  onGeneratePitch: (lead: Lead) => void
}

export function LeadDetail({ lead, pitch, onGeneratePitch }: LeadDetailProps) {
  if (!lead) {
    return (
      <Card className="flex min-h-[420px] items-center justify-center">
        <p className="text-sm text-text-secondary">Selecione um lead para ver os detalhes.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Detalhe do lead</p>
              <h3 className="mt-3 text-3xl font-semibold text-text-primary">{lead.brand}</h3>
            </div>
            <Badge tone={lead.targetChannel === 'main' ? 'blue' : 'yellow'}>{targetChannelLabels[lead.targetChannel]}</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Globe className="h-4 w-4" />
                Site
              </div>
              <a className="mt-2 block text-sm text-text-primary underline-offset-4 hover:underline" href={lead.website} target="_blank" rel="noreferrer">
                {lead.website}
              </a>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Mail className="h-4 w-4" />
                Contato marketing
              </div>
              <p className="mt-2 text-sm text-text-primary">{lead.marketingContact}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Resumo de fit</p>
            <p className="mt-2 text-sm leading-6 text-text-primary">
              {nicheLabels[lead.niche]} com score {lead.score.total}. {lead.reasoning}
            </p>
            <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-3">
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Lancamento monitorado</p>
              <p className="mt-2 text-sm font-medium text-text-primary">{lead.launchLabel}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{lead.launchEvidence}</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Seu publico</p>
                <p className="mt-2 text-sm font-medium text-text-primary">{lead.audienceFitLabel}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{lead.audienceFitReasoning}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Por que hoje</p>
                <p className="mt-2 text-sm leading-6 text-text-primary">{lead.whyNow}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-text-muted">Bundle sugerido</p>
                <p className="mt-2 text-sm font-medium text-text-primary">{lead.recommendedBundleName}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{lead.recommendedAngle}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-text-muted">Como abordar</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{lead.recommendedNextStep}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Evidencias</p>
              <div className="mt-3 space-y-3">
                {lead.evidences.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <p className="text-sm text-text-primary">{item.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-muted">{item.date}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Historico e canais similares</p>
              <div className="mt-3 space-y-3">
                {lead.campaignHistory.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/8 bg-white/4 p-3">
                    <p className="text-sm text-text-primary">{item.summary}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-muted">
                      {item.sourceChannel} - {item.date}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {lead.similarChannels.map((item) => (
                  <span key={item} className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-text-primary">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Button leadingIcon={<Sparkles className="h-4 w-4" />} onClick={() => onGeneratePitch(lead)}>
            Gerar email de pitch
          </Button>
        </div>
      </Card>

      {pitch && pitch.leadId === lead.id ? (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Pitch generator</p>
                <h4 className="mt-2 text-2xl font-semibold text-text-primary">{pitch.bundleName}</h4>
                <p className="mt-2 text-sm text-text-secondary">Assunto sugerido: {pitch.subject}</p>
              </div>
              <Badge tone="green">{pitch.attachmentLabel}</Badge>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Versao proativa</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-text-primary">{pitch.proactive}</p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Versao reativa</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-text-primary">{pitch.reactive}</p>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
