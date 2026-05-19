import type { MarcaProspectada } from '../agent/schema.js'

interface LeadCardProps {
  marca: MarcaProspectada
  onOpenDetail: () => void
  onMarkContact: () => void
  selected?: boolean
}

const fitTone = (score: number) =>
  score >= 9 ? 'text-green-400' : score >= 7 ? 'text-yellow-400' : 'text-zinc-400'

const fonteEmailIcon = (fonte: string) => {
  if (fonte === 'nao_localizado') return '✗'
  if (fonte.startsWith('inferido')) return 'ⓘ'
  return '✓'
}

export function LeadCard({ marca, onOpenDetail, onMarkContact, selected }: LeadCardProps) {
  const tier = marca.ticket_estimado_brl
  const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n)
  const truncate = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n) + '…')
  const principalLancamento = marca.lancamentos_proximos[0]
  const produtoOuJogo = marca.plano_parceria?.produto_ou_jogo ?? principalLancamento?.titulo ?? marca.categoria
  const gancho =
    marca.plano_parceria?.gancho_lancamento ??
    (principalLancamento ? `${principalLancamento.titulo} · ${principalLancamento.data_prevista}` : 'Campanha sem lançamento confirmado')
  const ativacao = marca.plano_parceria?.proposta_ativacao ?? marca.argumento_pitch

  return (
    <div
      className={
        'rounded-[10px] border bg-[#131316] p-4 ' +
        (selected ? 'border-violet-500/40' : 'border-white/[0.06]')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base text-white">{marca.marca}</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            {marca.categoria} · {marca.porte} · BR {marca.operacao_brasil}
          </p>
        </div>
        <div className={`font-mono text-sm ${fitTone(marca.fit_demografico.score)}`}>
          Fit {marca.fit_demografico.score}/10
        </div>
      </div>

      <div className="mt-3 inline-block rounded-md bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
        {marca.tipo_publi_recomendado}
      </div>

      <div className="mt-2 font-mono text-xs text-zinc-300">
        R$ {fmt(tier.minimo)} – {fmt(tier.ideal)} – {fmt(tier.premium)}
      </div>

      <div className="mt-3 rounded-md border border-white/[0.06] bg-black/20 p-3">
        <p className="text-[11px] uppercase tracking-wide text-zinc-500">Parceria sugerida</p>
        <p className="mt-1 text-sm font-medium text-zinc-100">{truncate(produtoOuJogo, 70)}</p>
        <p className="mt-1 text-xs leading-snug text-emerald-300">{truncate(gancho, 110)}</p>
        <p className="mt-2 text-xs leading-snug text-zinc-300">{truncate(ativacao, 150)}</p>
      </div>

      {marca.lancamentos_proximos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {marca.lancamentos_proximos.slice(0, 2).map((l) => (
            <span key={l.titulo} className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
              {l.tipo === 'jogo' ? '🎮' : l.tipo === 'produto' ? '📦' : l.tipo === 'evento' ? '🎫' : '📺'} {l.titulo} · {l.data_prevista}
            </span>
          ))}
          {marca.lancamentos_proximos.length > 2 && (
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
              +{marca.lancamentos_proximos.length - 2} mais
            </span>
          )}
        </div>
      )}

      <p className="mt-2 text-sm leading-snug text-zinc-300">
        {truncate(marca.fit_demografico.justificativa, 140)}
      </p>

      {marca.alertas.length > 0 && (
        <div className="mt-2 inline-block rounded-md bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-300">
          ⚠ {marca.alertas.length} alerta{marca.alertas.length > 1 ? 's' : ''}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
        <span>{fonteEmailIcon(marca.contato.fonte_email)}</span>
        <span className="font-mono">{marca.contato.email_primario ?? '—'}</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOpenDetail}
          className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
        >
          Ver detalhe
        </button>
        <button
          type="button"
          onClick={onMarkContact}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
        >
          Marcar a contatar
        </button>
      </div>
    </div>
  )
}
