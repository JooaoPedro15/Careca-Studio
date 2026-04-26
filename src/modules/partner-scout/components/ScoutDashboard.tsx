import { Radar, RefreshCw, Settings2 } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { StatCard } from '@/components/ui/StatCard'
import { LeadCard } from '@/modules/partner-scout/components/LeadCard'
import type { DailySummary, Lead, LeadFilters } from '@/modules/partner-scout/data/leads.store'
import { gameNicheList, nicheLabels } from '@/modules/partner-scout/data/niche-filters'

interface ScoutDashboardProps {
  leads: Lead[]
  selectedLeadId: string | null
  filters: LeadFilters
  summary: DailySummary | null
  isRefreshing: boolean
  onSelectLead: (leadId: string) => void
  onPatchFilters: (patch: Partial<LeadFilters>) => void
  onGeneratePitch: (lead: Lead) => void
  onMarkContacted: (leadId: string) => void
  onOpenSources: () => void
  onRefresh: () => void | Promise<void>
}

export function ScoutDashboard({
  leads,
  selectedLeadId,
  filters,
  summary,
  isRefreshing,
  onSelectLead,
  onPatchFilters,
  onGeneratePitch,
  onMarkContacted,
  onOpenSources,
  onRefresh,
}: ScoutDashboardProps) {
  const generatedAtLabel = summary
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(summary.generatedAt))
    : null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(138,180,255,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.3em] text-text-muted">Partner Scout</p>
              <h3 className="mt-3 text-3xl font-semibold text-text-primary">Melhores parceiros games para abordar hoje</h3>
              <p className="mt-3 text-sm leading-7 text-text-secondary">
                O radar agora olha so para games e destaca o lancamento monitorado de cada marca antes da recomendacao comercial.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                leadingIcon={<RefreshCw className={isRefreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />}
                variant="ghost"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                Atualizar radar
              </Button>
              <Button leadingIcon={<Settings2 className="h-4 w-4" />} variant="ghost" onClick={onOpenSources}>
                Fontes e nichos
              </Button>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Output diario</p>
            <p className="mt-2 text-lg font-semibold text-text-primary">{summary?.message ?? 'Gerando radar local...'}</p>
            <p className="mt-2 text-sm text-text-secondary">
              {summary?.audienceSnapshot ?? 'Carregando leitura do seu publico para priorizar o radar do dia.'}
            </p>
            <p className="mt-2 text-sm text-text-secondary">
              Base de hoje: {summary?.referenceDate ?? '--'}
              {generatedAtLabel ? ` | atualizado ${generatedAtLabel}` : ''}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Abordar hoje" value={String(summary?.hot ?? 0)} hint="janela imediata" icon={<Radar className="h-4 w-4" />} />
        <StatCard label="Boa janela" value={String(summary?.warm ?? 0)} hint="vale aquecer agora" icon={<Radar className="h-4 w-4" />} />
        <StatCard label="Lancamentos" value={String(summary?.launching ?? 0)} hint="claros no radar" icon={<Radar className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <CustomSelect
          value={filters.niche}
          onChange={(value) => onPatchFilters({ niche: value as LeadFilters['niche'] })}
          options={[{ value: 'all', label: 'Todos os subnichos games' }, ...gameNicheList.map((niche) => ({ value: niche, label: nicheLabels[niche] }))]}
        />
        <CustomSelect
          value={filters.timingSignal}
          onChange={(value) => onPatchFilters({ timingSignal: value as LeadFilters['timingSignal'] })}
          options={[
            { value: 'all', label: 'Todo timing' },
            { value: 'launch_30d', label: 'Lancamento em 30d' },
            { value: 'launch_60d', label: 'Lancamento em 60d' },
            { value: 'competitor_7d', label: 'Patrocinio em 7d' },
            { value: 'job_open', label: 'Vaga de marketing' },
          ]}
        />
      </div>

      <div className="grid gap-4">
        {leads.length > 0 ? (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              selected={lead.id === selectedLeadId}
              onSelect={() => onSelectLead(lead.id)}
              onGeneratePitch={() => onGeneratePitch(lead)}
              onMarkContacted={() => onMarkContacted(lead.id)}
            />
          ))
        ) : (
          <Card>
            <p className="text-sm leading-6 text-text-secondary">
              Nenhum parceiro passou pelos filtros de hoje. Tente abrir mais nichos ou atualizar o radar de novo.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
