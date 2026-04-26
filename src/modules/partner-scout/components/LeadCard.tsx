import { MailPlus, Send, Star } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { nicheLabels, targetChannelLabels, ticketBandLabels } from '@/modules/partner-scout/data/niche-filters'
import type { Lead } from '@/modules/partner-scout/data/leads.store'

interface LeadCardProps {
  lead: Lead
  selected: boolean
  onSelect: () => void
  onGeneratePitch: () => void
  onMarkContacted: () => void
}

export function LeadCard({ lead, selected, onSelect, onGeneratePitch, onMarkContacted }: LeadCardProps) {
  const priorityTone = lead.priority === 'hot' ? 'green' : lead.priority === 'warm' ? 'yellow' : 'neutral'
  const priorityLabel = lead.priority === 'hot' ? 'Abordar hoje' : lead.priority === 'warm' ? 'Boa janela' : 'Monitorar'

  return (
    <Card
      className={
        selected
          ? 'border-white/20 bg-[radial-gradient(circle_at_top_right,rgba(138,180,255,0.14),transparent_30%),rgba(255,255,255,0.03)]'
          : undefined
      }
    >
      <div className="space-y-4">
        <button type="button" onClick={onSelect} className="w-full text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xl font-semibold text-text-primary">{lead.brand}</p>
              <p className="mt-2 text-sm text-text-secondary">{nicheLabels[lead.niche]}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Fit score</p>
              <p className="mt-1 text-2xl font-semibold text-text-primary">{lead.score.total}</p>
            </div>
          </div>
        </button>

        <div className="flex flex-wrap gap-2">
          <Badge tone={priorityTone}>{priorityLabel}</Badge>
          <Badge tone={lead.targetChannel === 'main' ? 'blue' : 'yellow'}>{targetChannelLabels[lead.targetChannel]}</Badge>
          <Badge tone="neutral">{ticketBandLabels[lead.ticketBand]}</Badge>
          <Badge tone={lead.reviewRequired ? 'yellow' : 'green'}>{lead.reviewRequired ? 'Review manual' : 'Aprovado'}</Badge>
        </div>

        <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Lancamento monitorado</p>
          <p className="mt-2 text-sm font-medium text-text-primary">{lead.launchLabel}</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{lead.launchEvidence}</p>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Star className="h-4 w-4" />
            {lead.timingLabel}
          </div>
          <p className="mt-3 text-sm leading-6 text-text-primary">{lead.whyNow}</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">Bundle sugerido: {lead.recommendedBundleName}</p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{lead.recommendedAngle}</p>
          <p className="mt-2 text-xs leading-5 text-text-muted">{lead.evidences[0]?.label}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button leadingIcon={<Send className="h-4 w-4" />} variant="ghost" onClick={onGeneratePitch}>
            Gerar pitch
          </Button>
          <Button leadingIcon={<MailPlus className="h-4 w-4" />} variant="ghost" onClick={onMarkContacted} disabled={lead.contacted}>
            {lead.contacted ? 'Contatado' : 'Marcar contatado'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
