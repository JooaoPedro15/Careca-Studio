import type { MarcaProspectada } from '../agent/schema.js'
import type { ProspectionRun, RunProgressEvent } from '../agent/run.js'
import type { BrandCacheEntry } from '../data/brand-cache.types.js'
import { LeadCard } from './LeadCard.js'

interface ScoutDashboardProps {
  status: 'idle' | 'running' | 'done' | 'error'
  currentRun: ProspectionRun | null
  runs: ProspectionRun[]
  cache: BrandCacheEntry[]
  progressLog: RunProgressEvent[]
  tab: 'top' | 'history' | 'cache'
  onTab: (t: 'top' | 'history' | 'cache') => void
  onRun: () => void
  onAbort: () => void
  onSelectMarca: (m: MarcaProspectada) => void
  onMarkContact: (m: MarcaProspectada) => void
  onOpenSettings: () => void
}

export function ScoutDashboard(props: ScoutDashboardProps) {
  const { status, currentRun, runs, cache, progressLog, tab } = props

  const groupByCategoria = (marcas: MarcaProspectada[]) => {
    const groups: Record<string, MarcaProspectada[]> = {}
    for (const m of marcas) {
      groups[m.categoria] ??= []
      groups[m.categoria]!.push(m)
    }
    return groups
  }

  const top10 = currentRun?.result
    ? currentRun.result.resultado_final.filter((m) =>
        currentRun.result!.top_10_destaque.includes(m.marca),
      )
    : []
  const cardsToShow = tab === 'top' ? (top10.length > 0 ? top10 : currentRun?.result?.resultado_final ?? []) : []
  const groups = groupByCategoria(cardsToShow)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-white">Partner Scout</h1>
          {currentRun && (
            <p className="mt-1 font-mono text-xs text-zinc-400">
              Última run: {new Date(currentRun.startedAt).toLocaleString('pt-BR')} ·
              {' '}{currentRun.result?.resultado_final.length ?? 0} marcas ·
              {' '}US$ {currentRun.usage.custo_estimado_usd.toFixed(3)} ·
              {' '}{currentRun.usage.modelo_efetivo}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={props.onOpenSettings} className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5">
            Configurações
          </button>
          {status === 'running' ? (
            <button onClick={props.onAbort} className="rounded-md bg-red-500/80 px-4 py-2 text-sm text-white hover:bg-red-500">
              Cancelar run
            </button>
          ) : (
            <button onClick={props.onRun} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
              ▶ Nova varredura
            </button>
          )}
        </div>
      </header>

      <nav className="flex gap-1 border-b border-white/10">
        {(['top', 'history', 'cache'] as const).map((t) => (
          <button
            key={t}
            onClick={() => props.onTab(t)}
            className={
              'px-4 py-2 text-sm ' +
              (tab === t ? 'border-b-2 border-violet-500 text-white' : 'text-zinc-400 hover:text-white')
            }
          >
            {t === 'top' ? 'Top 10 do último run' : t === 'history' ? `Histórico (${runs.length})` : `Cache (${cache.length})`}
          </button>
        ))}
      </nav>

      {status === 'running' && (
        <section className="rounded-[10px] border border-white/10 bg-black/30 p-4">
          <p className="font-mono text-xs text-zinc-400">Log do agente (ao vivo)</p>
          <div className="mt-2 max-h-64 overflow-y-auto font-mono text-xs text-zinc-300">
            {progressLog.map((e, i) => (
              <p key={i} className="leading-snug">[{e.kind}] {e.detail}</p>
            ))}
          </div>
        </section>
      )}

      {tab === 'top' && cardsToShow.length === 0 && status === 'idle' && (
        <p className="text-center text-sm text-zinc-500">Nenhum run ainda. Clique em "Nova varredura" pra começar.</p>
      )}

      {tab === 'top' && Object.entries(groups).map(([cat, marcas]) => (
        <section key={cat}>
          <h3 className="mb-3 text-xs uppercase tracking-wide text-zinc-400">{cat} ({marcas.length})</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {marcas.map((m) => (
              <LeadCard
                key={m.marca}
                marca={m}
                onOpenDetail={() => props.onSelectMarca(m)}
                onMarkContact={() => props.onMarkContact(m)}
              />
            ))}
          </div>
        </section>
      ))}

      {tab === 'history' && (
        <ul className="space-y-2 font-mono text-sm text-zinc-300">
          {runs.map((r) => (
            <li key={r.id} className="rounded-md border border-white/10 bg-white/[0.02] p-3">
              <p>{new Date(r.startedAt).toLocaleString('pt-BR')} · {r.status} · {r.result?.resultado_final.length ?? 0} marcas · US$ {r.usage.custo_estimado_usd.toFixed(3)}</p>
            </li>
          ))}
        </ul>
      )}

      {tab === 'cache' && (
        <ul className="space-y-2 font-mono text-sm text-zinc-300">
          {cache.map((c) => (
            <li key={c.nome_normalizado} className="rounded-md border border-white/10 bg-white/[0.02] p-3 flex justify-between">
              <span>{c.nome_display}</span>
              <span className="text-zinc-500">{c.status} · {c.ultima_descoberta.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
