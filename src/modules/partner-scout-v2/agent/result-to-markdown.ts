import type { MarcaProspectada, ProspectionResult } from './schema.js'

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function renderBrand(m: MarcaProspectada): string {
  const lines: string[] = []
  lines.push(`### ${m.marca}${m.categoria ? ` — ${m.categoria}` : ''}`)
  if (m.site) lines.push(`- **Site:** ${m.site}`)
  if (m.operacao_brasil || m.porte) {
    lines.push(`- **Operação BR:** ${m.operacao_brasil ?? '?'} · porte ${m.porte ?? '?'}`)
  }

  const contato = m.contato
  if (contato) {
    const email = contato.email_primario ?? '_não localizado_'
    lines.push(`- **Email:** ${email} (${contato.fonte_email ?? 'sem fonte'})`)
    if (contato.email_alternativo) {
      lines.push(`- **Email alternativo:** ${contato.email_alternativo}`)
    }

    const li = contato.linkedin_decisor
    if (li && (li.nome || li.url)) {
      const cargo = li.cargo ? ` (${li.cargo})` : ''
      const url = li.url ? ` — ${li.url}` : ''
      lines.push(`- **LinkedIn decisor:** ${li.nome ?? '?'}${cargo}${url}`)
    }
    if (contato.agencia_representante) {
      lines.push(`- **Agência:** ${contato.agencia_representante}`)
    }
    if (contato.formulario_parcerias) {
      lines.push(`- **Formulário:** ${contato.formulario_parcerias}`)
    }
  }

  const t = m.ticket_estimado_brl
  if (t) {
    lines.push(`- **Ticket BRL:** R$ ${brl(t.minimo)} / **R$ ${brl(t.ideal)}** / R$ ${brl(t.premium)} — _${t.base_calculo}_`)
  }
  if (m.tipo_publi_recomendado) lines.push(`- **Tipo de publi:** ${m.tipo_publi_recomendado}`)
  if (m.fit_demografico) {
    lines.push(`- **Fit demográfico:** ${m.fit_demografico.score}/100 — ${m.fit_demografico.justificativa}`)
  }

  if (m.lancamentos_proximos && m.lancamentos_proximos.length > 0) {
    const items = m.lancamentos_proximos.map((l) => `${l.titulo} (${l.tipo}, ${l.data_prevista})`).join(' · ')
    lines.push(`- **Lançamentos:** ${items}`)
  }

  if (m.plano_parceria) {
    const p = m.plano_parceria
    lines.push('')
    lines.push(`**Plano de parceria:**`)
    lines.push(`- Produto/Jogo: ${p.produto_ou_jogo}`)
    lines.push(`- Gancho: ${p.gancho_lancamento}`)
    lines.push(`- Ativação: ${p.proposta_ativacao}`)
    lines.push(`- Entregáveis: ${p.formatos_entregaveis.join(', ')}`)
    lines.push(`- Período ideal: ${p.periodo_ideal}`)
    lines.push(`- Ideia de vídeo: ${p.ideia_de_video}`)
    lines.push(`- Por que faz sentido: ${p.porque_faz_sentido}`)
  }

  if (m.argumento_pitch) {
    lines.push('')
    lines.push(`**Pitch:** ${m.argumento_pitch}`)
  }

  if (m.alertas && m.alertas.length > 0) {
    lines.push('')
    lines.push(`> ⚠️ ${m.alertas.join(' · ')}`)
  }

  if (m.campanhas_recentes_creator && m.campanhas_recentes_creator.length > 0) {
    lines.push('')
    lines.push(`_Campanhas recentes:_`)
    for (const c of m.campanhas_recentes_creator) {
      lines.push(`- ${c.creator} → ${c.marca_no_post} (${c.data}) — ${c.link}`)
    }
  }

  return lines.join('\n')
}

function groupByCategoria(marcas: MarcaProspectada[]): Map<string, MarcaProspectada[]> {
  const groups = new Map<string, MarcaProspectada[]>()
  for (const m of marcas) {
    const arr = groups.get(m.categoria) ?? []
    arr.push(m)
    groups.set(m.categoria, arr)
  }
  return groups
}

export function resultToMarkdown(r: ProspectionResult): string {
  const lines: string[] = []
  const data = r.executado_em?.slice(0, 10) ?? '?'
  const trendingCount = r.resultado_final?.length ?? 0
  const evergreenCount = r.marcas_atemporais?.length ?? 0
  const trendingList = r.resultado_final ?? []
  const evergreenList = r.marcas_atemporais ?? []

  lines.push(`# Partner Scout — ${r.criador}`)
  lines.push('')
  lines.push(`> **Data da pesquisa:** ${data} · **Janela:** ${r.janela_temporal_busca ?? '?'}`)
  lines.push(`> **Resultados:** ${trendingCount} trending + ${evergreenCount} atemporais · ${r.candidatos_descobertos ?? 0} candidatos descobertos`)
  if (r.estatisticas_busca) {
    lines.push(`> **Estatísticas de email:** ${r.estatisticas_busca.emails_encontrados} encontrados · ${r.estatisticas_busca.emails_inferidos} inferidos · ${r.estatisticas_busca.emails_nao_localizados} não localizados`)
  }
  lines.push('')

  if (r.top_10_destaque && r.top_10_destaque.length > 0) {
    lines.push('## ⭐ Top 10')
    lines.push('')
    for (const nome of r.top_10_destaque) lines.push(`- ${nome}`)
    lines.push('')
  }

  if (evergreenCount > 0) {
    lines.push('## 🏛️ Marcas Atemporais')
    lines.push('')
    lines.push('_Marcas que sempre fazem sentido pro canal, independente de tendência._')
    lines.push('')
    for (const m of evergreenList) {
      lines.push(renderBrand(m))
      lines.push('')
    }
  }

  lines.push('## 🔥 Trending — por categoria')
  lines.push('')
  const groups = groupByCategoria(trendingList)
  for (const [categoria, marcas] of groups) {
    lines.push(`### Categoria: ${categoria} (${marcas.length})`)
    lines.push('')
    for (const m of marcas) {
      lines.push(renderBrand(m))
      lines.push('')
    }
  }

  if (r.proximas_acoes_sugeridas && r.proximas_acoes_sugeridas.length > 0) {
    lines.push('## ✅ Próximas ações sugeridas')
    lines.push('')
    for (const a of r.proximas_acoes_sugeridas) lines.push(`- ${a}`)
    lines.push('')
  }

  if (r.queries_executadas && r.queries_executadas.length > 0) {
    lines.push('---')
    lines.push('')
    lines.push('<details><summary>Queries executadas</summary>')
    lines.push('')
    for (const q of r.queries_executadas) lines.push(`- \`${q}\``)
    lines.push('')
    lines.push('</details>')
  }

  return lines.join('\n')
}
