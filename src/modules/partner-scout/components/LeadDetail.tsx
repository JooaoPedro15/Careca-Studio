import { useEffect, useState } from 'react'

import type { MarcaProspectada, ContatoMarca } from '../agent/schema.js'
import type { BrandStatus } from '../data/brand-cache.types.js'
import type { PartnerAiStatus } from '../data/partner-database.types.js'

interface LeadDetailProps {
  marca: MarcaProspectada | null
  onClose: () => void
  onSaveContact: (patch: Partial<ContatoMarca>) => void
  onSetStatus: (status: BrandStatus, nota?: string) => void
  onEnrich: (marca: MarcaProspectada) => void
  isEnriching: boolean
  aiStatus: PartnerAiStatus | null
}

const STATUSES: BrandStatus[] = [
  'descoberta',
  'a_contatar',
  'contatada',
  'em_negociacao',
  'convertida',
  'sem_retorno',
  'rejeitada',
  'pular',
]

export function LeadDetail({ marca, onClose, onSaveContact, onSetStatus, onEnrich, isEnriching, aiStatus }: LeadDetailProps) {
  const [emailPrimario, setEmailPrimario] = useState(marca?.contato.email_primario ?? '')
  const [emailAlt, setEmailAlt] = useState(marca?.contato.email_alternativo ?? '')
  const [agencia, setAgencia] = useState(marca?.contato.agencia_representante ?? '')
  const [novaNota, setNovaNota] = useState('')

  useEffect(() => {
    setEmailPrimario(marca?.contato.email_primario ?? '')
    setEmailAlt(marca?.contato.email_alternativo ?? '')
    setAgencia(marca?.contato.agencia_representante ?? '')
  }, [marca])

  if (!marca) return null

  const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n)
  const principalLancamento = marca.lancamentos_proximos[0]
  const plano = marca.plano_parceria
  const produtoOuJogo = plano?.produto_ou_jogo ?? principalLancamento?.titulo ?? marca.categoria
  const gancho =
    plano?.gancho_lancamento ??
    (principalLancamento ? `${principalLancamento.titulo} · ${principalLancamento.data_prevista}` : 'Sem lançamento confirmado; usar campanha evergreen validada.')
  const propostaAtivacao = plano?.proposta_ativacao ?? marca.argumento_pitch
  const formatos = plano?.formatos_entregaveis ?? [marca.tipo_publi_recomendado]
  const periodoIdeal = plano?.periodo_ideal ?? 'Definir após resposta da marca'
  const ideiaVideo = plano?.ideia_de_video ?? marca.argumento_pitch
  const porqueFazSentido = plano?.porque_faz_sentido ?? marca.fit_demografico.justificativa

  return (
    <aside className="fixed right-0 top-0 z-30 h-full w-[480px] overflow-y-auto border-l border-white/10 bg-[#0e0e10] p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl text-white">{marca.marca}</h2>
          <a href={marca.site} target="_blank" rel="noreferrer" className="text-xs text-violet-300 underline">
            {marca.site}
          </a>
          <p className="mt-1 text-xs text-zinc-400">
            {marca.categoria} · {marca.porte} · BR {marca.operacao_brasil}
          </p>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white" aria-label="Fechar">
          ✕
        </button>
      </div>

      <section className="mt-6">
        <p className="text-3xl font-mono text-white">{marca.fit_demografico.score}/10</p>
        <p className="mt-1 text-sm text-zinc-300">{marca.fit_demografico.justificativa}</p>
      </section>

      <section className="mt-6 rounded-[10px] border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <p className="text-xs uppercase tracking-wide text-emerald-300">Plano de parceria</p>
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="text-xs text-zinc-500">Produto, jogo ou campanha</p>
            <p className="text-zinc-100">{produtoOuJogo}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Gancho de lançamento</p>
            <p className="text-zinc-100">{gancho}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Ativação recomendada</p>
            <p className="text-zinc-100">{propostaAtivacao}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-zinc-500">Período ideal</p>
              <p className="text-zinc-100">{periodoIdeal}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Entregáveis</p>
              <ul className="mt-1 space-y-1 text-zinc-100">
                {formatos.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Ideia de vídeo</p>
            <p className="text-zinc-100">{ideiaVideo}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">Por que faz sentido</p>
            <p className="text-zinc-100">{porqueFazSentido}</p>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[10px] border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Pitch sugerido</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500" title={aiStatus?.detail}>
              {aiStatus?.label ?? 'IA verificando'}
            </span>
            <button
              onClick={() => onEnrich(marca)}
              disabled={isEnriching}
              className="rounded border border-white/10 px-2 py-1 text-xs text-violet-300 hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEnriching ? 'Enriquecendo...' : 'Enriquecer IA'}
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(marca.argumento_pitch)}
              className="text-xs text-violet-300 hover:underline"
            >
              Copiar
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-zinc-200 whitespace-pre-line">{marca.argumento_pitch}</p>
      </section>

      <section className="mt-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Ticket estimado (BRL)</p>
        <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-sm">
          <div>
            <p className="text-zinc-500">mín</p>
            <p className="text-white">R$ {fmt(marca.ticket_estimado_brl.minimo)}</p>
          </div>
          <div>
            <p className="text-zinc-500">ideal</p>
            <p className="text-white">R$ {fmt(marca.ticket_estimado_brl.ideal)}</p>
          </div>
          <div>
            <p className="text-zinc-500">premium</p>
            <p className="text-white">R$ {fmt(marca.ticket_estimado_brl.premium)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500 font-mono">{marca.ticket_estimado_brl.base_calculo}</p>
      </section>

      <section className="mt-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Lançamentos próximos</p>
        {marca.lancamentos_proximos.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">Sem lançamentos confirmados nos próximos 6 meses.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-zinc-200">
            {marca.lancamentos_proximos.map((l) => (
              <li key={l.titulo} className="flex items-center gap-2">
                <span>{l.tipo === 'jogo' ? '🎮' : l.tipo === 'produto' ? '📦' : l.tipo === 'evento' ? '🎫' : '📺'}</span>
                <span className="font-medium">{l.titulo}</span>
                <span className="font-mono text-xs text-zinc-400">· {l.data_prevista}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Contato (editável)</p>
        <label className="mt-2 block text-xs text-zinc-300">
          Email primário
          <input
            type="email"
            value={emailPrimario}
            onChange={(e) => setEmailPrimario(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-sm text-white"
          />
        </label>
        <label className="mt-2 block text-xs text-zinc-300">
          Email alternativo
          <input
            type="email"
            value={emailAlt}
            onChange={(e) => setEmailAlt(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-sm text-white"
          />
        </label>
        <label className="mt-2 block text-xs text-zinc-300">
          Agência
          <input
            type="text"
            value={agencia}
            onChange={(e) => setAgencia(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm text-white"
          />
        </label>
        <button
          onClick={() => onSaveContact({
            email_primario: emailPrimario || null,
            email_alternativo: emailAlt || null,
            agencia_representante: agencia || null,
          })}
          className="mt-2 rounded-md bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-500"
        >
          Salvar contato
        </button>
        <p className="mt-2 text-xs text-zinc-500">Fonte original: {marca.contato.fonte_email}</p>
        {marca.contato.formulario_parcerias && (
          <a
            href={marca.contato.formulario_parcerias}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-xs text-violet-300 underline"
          >
            Formulário de parcerias →
          </a>
        )}
      </section>

      {marca.campanhas_recentes_creator.length > 0 && (
        <section className="mt-6">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Campanhas recentes</p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-300">
            {marca.campanhas_recentes_creator.map((c, i) => (
              <li key={i}>
                <a href={c.link} target="_blank" rel="noreferrer" className="text-violet-300 underline">
                  {c.creator}
                </a>{' '}
                · {c.data}
              </li>
            ))}
          </ul>
        </section>
      )}

      {marca.alertas.length > 0 && (
        <section className="mt-6">
          <p className="text-xs uppercase tracking-wide text-yellow-400">Alertas</p>
          <ul className="mt-2 list-disc pl-5 text-xs text-zinc-300">
            {marca.alertas.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Status</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onSetStatus(s, novaNota || undefined)}
              className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-violet-500/20"
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          value={novaNota}
          onChange={(e) => setNovaNota(e.target.value)}
          placeholder="Adicionar nota junto com a mudança de status (opcional)"
          className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
          rows={2}
        />
      </section>
    </aside>
  )
}
