# Partner Scout v2 — Agente LLM Gemini com google_search + url_context

**Data:** 2026-04-25
**Autor:** João (Roberto Careca) + Claude
**Status:** Aprovado pra implementação
**Substitui:** `02-partner-scout.md` (v1, agora movido pra `docs/legacy/`)

---

## 1. Contexto e motivação

A v1 do Partner Scout usa scrapers (YouTube Data API + Playwright TikTok + LinkedIn Jobs + game/series release) pra detectar marcas patrocinando canais concorrentes. O fluxo virou genérico: a base hardcoded de 80+ marcas + classificador de 6 subnichos mantinha o output preso às mesmas opções óbvias todo run.

A v2 substitui o pipeline inteiro por um **agente LLM Gemini** que faz descoberta de marcas em tempo real via `google_search` (grounding) e `url_context` (fetch de URLs), enriquece cada candidato com fit demográfico, ticket estimado e caminho de contato (incluindo email primário, decisor LinkedIn, agência representante), e ranqueia por score composto.

Mudança fundamental:
- **Antes:** scrapear 4-5 fontes fixas → classificar em 6 subnichos → score 0-100 → bundle shorts-first → pitch
- **Agora:** agente Gemini decide queries dinamicamente baseado no ano corrente, descobre 30+ candidatos, filtra eliminatoriamente, enriquece com schema rico, devolve ≥25 marcas com pitch copy-pastable

Reaproveita a chave Gemini que já existe no ambiente (mesma usada pelo ClipSplitter), sem precisar configurar nada na UI.

O system prompt completo da v2 (com regra temporal, contexto do criador, processo de descoberta em 5 fases, schema JSON, anti-padrões) é o coração do módulo e mora versionado no código.

## 2. Decisões locked-in (do brainstorming)

| Decisão | Escolha | Alternativas descartadas |
|---|---|---|
| Provider LLM | Google Gemini API (mesmo do ClipSplitter) | Anthropic Claude (5x mais caro, requer API key separada) |
| Modelo principal | `gemini-2.5-flash` | flash-lite (raso demais), pro (caro demais), Anthropic Sonnet |
| Cadeia de fallback | `gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-2.0-flash` em rate limit (espelha ClipSplitter) | Sem fallback (dor) |
| Tools do agente | `google_search` (grounding) + `url_context` — ambos nativos | Tools customizadas via REST externo |
| Cache de marcas | `electron-store` JSON em `userData/`, owned pelo main process | SQLite (over-engineering pra v1); Zustand persist (escopo errado) |
| Escopo UI | Redesenhar 4 componentes (`ScoutDashboard`, `LeadCard`, `LeadDetail`, `SourcesConfig`) do zero | Adaptar incremental; híbrido |
| `linkedin_search` | Pular tool dedicada — agente usa `google_search` com `site:linkedin.com` | Playwright (manutenção pesada) |
| `email_pattern_inference` | LLM raciocina padrão de email no contexto | Tool com lookup externo |
| Loop do agente | Streaming agêntico com tool calling em loop; caps por número de tool calls | Single-shot sem tools (perde dinamismo) |
| Resolução API key | Replica ClipSplitter: `process.env.GEMINI_API_KEY` → `D:\Projetos\Clip-Splitter\.env` → registro Windows `HKCU\Environment` | UI input + safeStorage (fricção desnecessária) |
| Output JSON | `responseMimeType: 'application/json'` + `responseSchema` (validação na geração) | Parse manual + re-prompt |
| Custo aceito | ~US$ 0,05–0,15 por run; ~US$ 1–3/mês com 2-4 runs/semana | — |
| Migração | Pasta paralela `partner-scout-v2/` + swap atômico | Edit-in-place (alto risco) |

**Desvios documentados do system prompt original (v0):**
1. `linkedin_search` não existe como tool — o agente faz `google_search` com `site:linkedin.com`.
2. `email_pattern_inference` não existe como tool — o agente raciocina o padrão no contexto.
3. `web_search` e `web_fetch` viram `google_search` e `url_context` (equivalentes Gemini).
4. Caps adicionados: ~30 candidatos, ~25 marcas no resultado, ~50 chamadas de tool por execução, `maxOutputTokens: 16384`, timeout 10min — proteção de custo.
5. Instrução explícita no prompt: "você DEVE chamar `google_search` no mínimo 15 vezes antes de finalizar o JSON" — compensa tendência do Gemini de finalizar cedo.
6. **Campo obrigatório `lancamentos_proximos` por marca** (jogos/produtos/eventos confirmados nos próximos 6 meses) + regra hard: pra publishers, plataformas gaming e hardware com calendário, o array DEVE ter ≥1 item; pra categorias sem calendário (cosmético, telecom, banco, etc.) array vazio é aceitável; quando não vazio, `argumento_pitch` DEVE referenciar pelo menos um item.

Tudo o mais do system prompt entra **literal**: regra temporal (Passo 0 com variáveis `{ANO_ATUAL}`/`{ANO_ANTERIOR}`/etc.), contexto do criador completo, 18 categorias-alvo, 7 queries-modelo, 5 fases do processo, schema JSON com 14 campos por marca, regras anti-genérico, score composto (0.35/0.25/0.20/0.20), anti-padrões.

## 3. Arquitetura de execução

```
┌────────────────────────────────────────────────────────────────────┐
│ RENDERER (React)                                                   │
│  ScoutDashboard.tsx                                                │
│   ├─ "Nova varredura" ────► ipc.partnerScout.run()                 │
│   ├─ ouvinte 'progress' (logs do agente em tempo real)             │
│   └─ ouvinte 'done' (resultado final)                              │
│  prospection-run.store.ts (Zustand UI state, sem persist)          │
└────────────────────────────────────────────────────────────────────┘
                              │ contextBridge (preload)
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ MAIN (Node.js)                                                     │
│  electron/ipc/partnerScout.ts (handlers)                           │
│  electron/services/partner-scout-agent.ts                          │
│   ├─ resolveGeminiApiKey() — env → .env → registro Windows         │
│   ├─ buildSystemPrompt(ctx) com ano resolvido + cache hint         │
│   ├─ Gemini API call streaming (REST direto, sem SDK):             │
│   │    POST https://generativelanguage.googleapis.com/v1beta/      │
│   │         models/{model}:streamGenerateContent?key=...           │
│   │    body: {                                                     │
│   │      systemInstruction: { parts: [{ text: prompt }] },         │
│   │      contents: [...],                                          │
│   │      tools: [{ google_search: {} }, { url_context: {} }],      │
│   │      generationConfig: {                                       │
│   │        responseMimeType: 'application/json',                   │
│   │        responseSchema: ProspectionResultSchema,                │
│   │        maxOutputTokens: 16384                                  │
│   │      }                                                         │
│   │    }                                                           │
│   ├─ Loop tool_use: ler chunks SSE, agregar function_calls,        │
│   │    enviar function_responses, repetir até finalizar            │
│   ├─ Fallback chain em 429: tenta próximo modelo da lista          │
│   ├─ Enforce caps (tool_use_count > 50 → finalizar via prompt)     │
│   ├─ Parse JSON do output final, persist run + upsert cache        │
│   └─ Retornar ProspectionRun                                       │
│  electron/services/brand-cache.ts (electron-store)                 │
│  electron/services/run-history.ts (electron-store)                 │
│  electron/services/gemini-key-resolver.ts (3 fontes)               │
└────────────────────────────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
                    Google Gemini API
```

**Pontos críticos:**

- **Sem SDK:** chamada REST direta igual o ClipSplitter (`request_gemini_json`). Reduz dependências, controle total sobre payload e streaming SSE.
- **Resolução de chave em cascata:** `gemini-key-resolver.ts` replica exatamente a lógica do `_carregar_gemini_api_key()` do ClipSplitter:
  1. `process.env.GEMINI_API_KEY`
  2. Lê `D:\Projetos\Clip-Splitter\.env` (parser linha por linha, normaliza placeholders tipo `COLE_SUA_CHAVE_AQUI`)
  3. Lê registro Windows `HKEY_CURRENT_USER\Environment\GEMINI_API_KEY` via `winreg` (módulo nativo Node não tem; usar `child_process.execSync('reg query ...')`)
  4. Retorna `{ key, source }` pra UI mostrar de onde veio
- **Resolução temporal dupla:** main injeta `ANO_ATUAL` via `new Date()`, prompt mantém instrução pro agente revalidar via `google_search` se desconfiar.
- **Cache hint injetado no input:** main lê `brand-history.json` antes de chamar o agente e adiciona `"Marcas a PULAR (status ativo nos últimos 90 dias): ..."`.
- **Streaming pra UX:** cada `function_call` (chamada `google_search` ou `url_context`) vira evento IPC `partnerScout:progress` mostrando query/url no log da UI.
- **Fallback de modelo:** se Gemini retorna `429` ou `503`, tenta próximo da lista `[gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.0-flash]`. Espelha o `for indice, model_name in enumerate(GEMINI_MODELS, ...)` do ClipSplitter.
- **Run em background no main:** `partnerScout:run` retorna `runId` imediatamente; UI escuta eventos.
- **1 run por vez no v1:** segundo `run` retorna `RUN_ALREADY_IN_PROGRESS`.
- **Erros tratados:** chave faltando (mensagem clara apontando 3 fontes), rate limit (fallback chain → erro só se TODOS modelos falharem), JSON inválido (não deve acontecer com `responseSchema`, mas re-prompt curto se acontecer), timeout 10min (`AbortController`).

## 4. Schema de dados (TypeScript)

### `src/modules/partner-scout/agent/schema.ts`

```typescript
export type OperacaoBrasil = 'confirmada' | 'provavel' | 'nao'
export type Porte = 'global' | 'regional_grande' | 'medio' | 'startup'
export type TipoPubli = 'short_patrocinado' | 'integracao' | 'codigo_desconto' | 'embaixador_long_term'
export type FonteEmail = string  // url | "inferido pelo padrão da empresa" | "nao_localizado"

export interface FitDemografico {
  score: number              // 1-10 (escala fiel ao prompt)
  justificativa: string      // 2 linhas, específica à marca
}

export interface TicketEstimadoBRL {
  minimo: number
  ideal: number
  premium: number
  base_calculo: string
}

export interface LinkedInDecisor {
  nome: string | null
  cargo: string | null
  url: string | null
}

export interface ContatoMarca {
  email_primario: string | null
  email_alternativo: string | null
  fonte_email: FonteEmail
  editavel: true             // sempre true
  linkedin_decisor: LinkedInDecisor
  agencia_representante: string | null
  formulario_parcerias: string | null
}

export interface CampanhaRecenteCreator {
  creator: string
  marca_no_post: string
  data: string               // ISO
  link: string
}

export type TipoLancamento = 'jogo' | 'produto' | 'evento' | 'temporada'

export interface LancamentoProximo {
  titulo: string             // nome específico, ex: "Ghost of Yotei"
  data_prevista: string      // ISO ou descrição: "2026-10-02" ou "Q3 2026"
  tipo: TipoLancamento
}

export interface MarcaProspectada {
  marca: string
  categoria: string
  site: string
  operacao_brasil: OperacaoBrasil
  ultima_atividade_publica: string  // ISO
  porte: Porte
  campanhas_recentes_creator: CampanhaRecenteCreator[]
  lancamentos_proximos: LancamentoProximo[]  // obrigatório ≥1 pra publishers/plataformas/hardware com calendário
  fit_demografico: FitDemografico
  tipo_publi_recomendado: TipoPubli
  ticket_estimado_brl: TicketEstimadoBRL
  contato: ContatoMarca
  argumento_pitch: string    // 4 linhas, copy-pastable; DEVE referenciar pelo menos 1 item de lancamentos_proximos quando array não for vazio
  alertas: string[]
}

export interface EstatisticasBusca {
  emails_encontrados: number
  emails_inferidos: number
  emails_nao_localizados: number
  categorias_cobertas: number
}

export interface ProspectionResult {
  executado_em: string                  // ISO
  ano_referencia: number
  janela_temporal_busca: string
  criador: string                       // "Roberto Careca" no v1 (string fixa)
  queries_executadas: string[]
  candidatos_descobertos: number
  filtrados: number
  resultado_final: MarcaProspectada[]   // mín. 25
  top_10_destaque: string[]
  estatisticas_busca: EstatisticasBusca
  proximas_acoes_sugeridas: string[]
}
```

### `responseSchema` Gemini

Mesmo schema acima exportado em formato OpenAPI (Gemini exige `type: 'OBJECT' | 'ARRAY' | 'STRING' | 'NUMBER' | 'BOOLEAN'` em maiúsculas). Função `toGeminiSchema()` converte os tipos TS pro formato Gemini. Validação acontece no servidor — se o agente tentar finalizar com schema inválido, Gemini regenera automaticamente.

### `src/modules/partner-scout/agent/run.ts`

```typescript
export type RunStatus = 'pending' | 'running' | 'done' | 'error' | 'aborted'

export interface RunUsage {
  prompt_tokens: number
  candidates_tokens: number          // Gemini chama "output" de "candidates"
  cached_content_tokens: number      // Gemini explicit cache (se ativado)
  tool_use_count: number             // total google_search + url_context
  modelo_efetivo: string             // qual da fallback chain foi usado
  custo_estimado_usd: number         // pós-run
}

export interface RunProgressEvent {
  ts: string
  kind: 'tool_use' | 'tool_result' | 'text_delta' | 'error' | 'phase' | 'fallback'
  detail: string                     // ex: "🔍 google_search: 'editora indie Brasil 2026'"
}

export interface ProspectionRun {
  id: string                         // uuid
  startedAt: string
  finishedAt: string | null
  status: RunStatus
  error: string | null
  usage: RunUsage
  result: ProspectionResult | null
  progressLog: RunProgressEvent[]
}
```

### `src/modules/partner-scout/data/brand-cache.types.ts`

```typescript
export type BrandStatus =
  | 'descoberta'        // só apareceu em run, nunca contatada
  | 'a_contatar'        // user marcou pra contato (sem ainda enviar)
  | 'contatada'         // email enviado
  | 'em_negociacao'     // resposta recebida, conversa em andamento
  | 'convertida'        // virou parceria
  | 'sem_retorno'       // contatada sem resposta
  | 'rejeitada'         // explicitamente rejeitada
  | 'pular'             // ignorar em runs futuros (conflito de exclusividade etc)

export interface BrandHistoryNote {
  ts: string
  text: string
}

export interface BrandCacheEntry {
  nome_normalizado: string         // chave: lowercase, sem acento, sem pontuação
  nome_display: string             // como o agente escreveu
  primeira_descoberta: string      // ISO
  ultima_descoberta: string        // ISO — atualizado a cada run
  status: BrandStatus
  status_atualizado_em: string
  ultimo_email_usado: string | null
  notas: BrandHistoryNote[]
  ultimo_enriquecimento: MarcaProspectada
}
```

**Política de cache hint:** estados `contatada`, `em_negociacao`, `convertida`, `sem_retorno`, `rejeitada`, `pular` com `status_atualizado_em` <90 dias entram na lista de PULAR. `descoberta` e `a_contatar` continuam sendo redescobertas.

**Normalização de nome de marca:** função utilitária em `utils/normalize-brand-name.ts` aplica lowercase + `.normalize('NFD').replace(/\p{Diacritic}/gu, '')` + remoção de pontuação.

## 5. System prompt: onde mora e como é montado

**Arquivo:** `src/modules/partner-scout/agent/system-prompt.ts`

```typescript
export interface CreatorProfile { /* espelha YAML do prompt */ }
export interface PromptContext {
  creator: CreatorProfile
  agora: Date                       // resolvido no main
  cacheHints: BrandCacheEntry[]     // já filtrado <90d
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const ano = ctx.agora.getFullYear()
  // ... resolve ANO_ATUAL, ANO_ANTERIOR, ANO_PROXIMO, TRIMESTRE_ATUAL, MES_ATUAL
  // ... renderiza creator YAML
  // ... renderiza cache block
  return `# PARTNER SCOUT — SYSTEM PROMPT
[... TEXTO INTEGRAL DO PROMPT ORIGINAL, com ajustes mínimos ...]

## FERRAMENTAS DISPONÍVEIS (atualizado pra Gemini)

- google_search — grounding nativo com Google Search. Use sempre que precisar
  descobrir marcas, validar campanhas recentes, encontrar press releases.
- url_context — fetch e leitura de URL específica. Use pra ler páginas
  /imprensa, /contato, /parcerias, perfis LinkedIn, sites das marcas.
- (linkedin_search NÃO disponível — use google_search com site:linkedin.com)
- (email_pattern_inference NÃO disponível — raciocine padrão no contexto)

## CONTRATO DE EXECUÇÃO MÍNIMO

- Você DEVE chamar google_search no mínimo 15 vezes antes de finalizar.
- Você DEVE descobrir mínimo 30 candidatos antes de filtrar.
- Você DEVE retornar mínimo 25 marcas no resultado_final.
- Você DEVE produzir o JSON final no schema exato (validação automática).

## CONTEXTO DE EXECUÇÃO (preenchido pelo runtime)

Data de hoje (do sistema): ${dataIso}
Variáveis temporais resolvidas: ANO_ATUAL=${ano} ...
Use essas variáveis em todas as queries.

## CONTEXTO DO CRIADOR (snapshot atual)

${creatorYaml}

## MARCAS EM CACHE — PULAR (status ativo nos últimos 90 dias)

${cacheBlock}
`
}
```

**Decisões:**

1. Texto literal do prompt vai inline no template.
2. `CreatorProfile` exportado de `src/modules/partner-scout/data/creator-profile.ts` como constante `ROBERTO_CARECA_PROFILE`. Edição manual no v1.
3. `agora: Date` injetado externamente (testabilidade com data fake).
4. `cacheHints` já vem filtrado pelo `brand-cache.ts`.
5. **Bloco "FERRAMENTAS DISPONÍVEIS" reescrito** pra refletir tools Gemini (google_search + url_context) em vez das tools Anthropic do prompt original.
6. **Bloco "CONTRATO DE EXECUÇÃO MÍNIMO" adicionado** — compensa tendência do Gemini de finalizar cedo. Mínimos hard-coded no prompt.
7. **Prompt caching Gemini:** v1 NÃO usa Gemini Caches API (mais complicado de configurar e ganho marginal pro volume esperado de runs). Anotado como otimização futura se custo virar problema.

## 6. IPC contract

### `electron/preload.ts` — `window.careca.partnerScout`

```typescript
{
  // Execução
  run: () => Promise<{ runId: string }>
  abort: (runId: string) => Promise<{ ok: boolean }>
  onProgress: (cb: (e: RunProgressEvent) => void) => () => void
  onDone: (cb: (run: ProspectionRun) => void) => () => void
  onError: (cb: (p: { runId: string; error: string }) => void) => () => void

  // Histórico
  listRuns: () => Promise<ProspectionRun[]>
  getRun: (runId: string) => Promise<ProspectionRun | null>
  deleteRun: (runId: string) => Promise<{ ok: boolean }>

  // Cache
  listCache: () => Promise<BrandCacheEntry[]>
  setBrandStatus: (n: string, s: BrandStatus, nota?: string) => Promise<BrandCacheEntry>
  updateBrandContact: (n: string, patch: Partial<ContatoMarca>) => Promise<BrandCacheEntry>
  addBrandNote: (n: string, text: string) => Promise<BrandCacheEntry>

  // Configuração (LEITURA — não há mais set de API key)
  getApiKeyStatus: () => Promise<{
    configured: boolean
    source: 'env' | 'clip-splitter-dotenv' | 'windows-registry' | 'nenhuma'
    masked?: string                  // ex: "AIza...xyz"
  }>
  getCreatorProfile: () => Promise<CreatorProfile>
}
```

### Eventos main → renderer

| Evento | Payload | Quando |
|---|---|---|
| `partnerScout:progress` | `RunProgressEvent` | a cada `function_call`, `function_response`, ou texto significativo |
| `partnerScout:done` | `ProspectionRun` | run concluído com sucesso |
| `partnerScout:error` | `{ runId, error }` | falha (API, timeout, todos modelos da fallback chain falharam) |

### Decisões

- **API key NÃO entra na UI** — lida automaticamente das 3 fontes. UI só mostra status (configurada / fonte / masked).
- Run roda em background; UI só escuta eventos.
- Só 1 run por vez (segundo `run` → erro `RUN_ALREADY_IN_PROGRESS`).
- `updateBrandContact` permite edição manual de email/linkedin/agência/formulário.
- `abort` cancela via `AbortController`; salva `ProspectionRun` parcial com status `aborted`.

## 7. UI redesenhada (4 componentes)

### `ScoutDashboard.tsx`

Header com botão "Nova varredura" + metadados do último run (data, total marcas, custo USD, modelo efetivo).

3 tabs:
- **Top 10 do último run** (default) — agrupado por categoria, com filtros (categoria, porte, fit ≥)
- **Histórico** — lista de runs anteriores
- **Cache** — todas as marcas já vistas, com filtros por status

Painel lateral colapsável **"Log do agente"** durante run rodando, scrollable, JetBrains Mono, max 200 linhas. Inclui eventos de fallback de modelo (ex: *"⚠ flash retornou 429 — tentando flash-lite"*).

### `LeadCard.tsx`

Compacto:
- `marca` + `fit_demografico.score` (10/10 verde, 7-9 amarelo, ≤6 cinza)
- linha de metadados: categoria · porte · `operacao_brasil`
- badge `tipo_publi_recomendado` (purple)
- ticket BRL nos 3 tiers (mono font, formatação BR)
- **`lancamentos_proximos`** — primeiros 2 itens em badges destacadas (ex: "🎮 Ghost of Yotei · Out/2026"); restante em "+N mais"
- preview de `fit_demografico.justificativa` (3 linhas, truncado)
- contagem de alertas (badge yellow)
- email primário + ícone de `fonte_email` (✓ url, ⓘ inferido, ✗ nao_localizado)
- botões: "Ver detalhe", "Marcar a contatar"

### `LeadDetail.tsx` (painel lateral 480px)

Seções verticais:
1. Header — marca, link site, badges
2. Score & Justificativa
3. Pitch sugerido (botão Copiar)
4. Ticket estimado (3 tiers + base_calculo)
5. Tipo de publi
6. **Lançamentos próximos** — lista completa de `lancamentos_proximos` com `titulo`, `data_prevista` e `tipo` (ícone por tipo: 🎮 jogo, 📦 produto, 🎫 evento, 📺 temporada). Se vazio, mostrar "Sem lançamentos confirmados nos próximos 6 meses"
7. **Contato — todos os campos editáveis inline** (validação básica de email)
8. Campanhas recentes do criador (lista com links)
9. Alertas
10. Status & Notas (dropdown 8 status, input de nota livre, timeline)
11. Última atividade pública (data + idade)
12. Footer (ultima_descoberta + "Marcar como pular permanentemente")

### `SourcesConfig.tsx`

5 seções:
1. **Gemini API**
   - Status: ✓ Configurada (fonte: `clip-splitter-dotenv`) / ✗ Não configurada
   - Chave mascarada (ex: `AIza...xyz`)
   - Texto: *"Pra mudar a chave, edite uma das 3 fontes (env, .env do Clip-Splitter, ou registro Windows) e reinicie o app."*
   - Link pra console Google AI Studio
2. **Perfil do criador** — read-only no v1, instrução de editar `creator-profile.ts`
3. **Limites de execução** — max candidatos (30), max marcas (25), max tool calls (50), modelo (dropdown com 3 opções da fallback chain)
4. **Cache** — janela de skip (90d), botão "Limpar cache" (com confirmação), contador
5. **Telemetria de custo** — total 30d, média por run, distribuição por modelo (qual da fallback chain mais usado)

Design system mantém: paleta dark, Space Grotesk + JetBrains Mono, accent purple `#7c3aed`, cards `bg-surface` + border `rgba(255,255,255,0.06)` (definido na skill `careca-studio`).

## 8. Custos e safeguards

### Estimativa de custo por run (Gemini 2.5 Flash)

Pricing base (Apr 2026):
- Input: US$ 0,30 / 1M tokens
- Output: US$ 2,50 / 1M tokens
- Google Search grounding: US$ 35 / 1k requests (tier pago); free tier ~500/dia em flash-lite, mais limitado em flash

| Componente | Estimativa |
|---|---|
| System prompt + criador + cache hint | ~8k tokens input |
| Iterações tool_use (15-20 google_search + 10-15 url_context) | ~80k tokens input agregado |
| Output JSON (25 marcas) | ~12k tokens output |
| Google Search grounding (~20 queries) | ~US$ 0,02 (ou free tier) |
| **Total estimado** | **~US$ 0,05–0,15 por run** |

Uso esperado: 2-4 runs/semana → **US$ 1–3/mês**.

Pra comparação: a versão Anthropic Claude estaria em US$ 8-20/mês — economia de ~85%.

### Salvaguardas hard-coded

- `maxOutputTokens: 16384` na request
- `tool_use_count > 50` → injeta function_response especial dizendo "limite atingido, finalize com o JSON" e força stop
- Timeout total 10 minutos → `AbortController` cancela
- `usage` calculado e mostrado ao user no `done`
- **Fallback de modelo:** se HTTP 429 ou 503, tenta próximo da lista `[gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.0-flash]`. Anota no `RunProgressEvent` (`kind: 'fallback'`) e no `RunUsage.modelo_efetivo` qual virou o efetivo.

### Salvaguardas configuráveis (`SourcesConfig`)

- Max candidatos descobertos (default 30, range 20-50)
- Max marcas no resultado (default 25, range 15-40)
- Max tool calls (default 50, range 30-100)
- Modelo principal (dropdown: `gemini-2.5-flash` default | `gemini-2.5-flash-lite` | `gemini-2.5-pro`)

### Persistência (`electron-store`)

| Arquivo | Conteúdo | Tamanho esperado |
|---|---|---|
| `userData/partner-scout-settings.json` | Limites, modelo, janela cache | <5 KB |
| `userData/partner-scout-cache.json` | Marcas histórico | até ~5 MB pra 2k marcas |
| `userData/partner-scout-runs.json` | Últimos 20 runs com result | até ~3 MB |

API key NÃO é persistida em arquivo do app — sempre lida em runtime das 3 fontes externas.

### Telemetria local (sem envio externo)

`prospection-run.store.ts` computa: total gasto 30d, custo médio por run, taxa "emails encontrados / total marcas", categorias mais cobertas, distribuição por modelo efetivo (quanto cada da fallback chain foi usado). Tudo derivado do `run-history.json`.

## 9. Estrutura de arquivos final

```
careca-studio/
├── electron/
│   ├── ipc/
│   │   └── partnerScout.ts           ← REWRITE
│   └── services/
│       ├── partner-scout-agent.ts    ← NEW (orquestrador Gemini REST)
│       ├── gemini-key-resolver.ts    ← NEW (3 fontes, espelha ClipSplitter)
│       ├── brand-cache.ts            ← NEW (electron-store wrapper)
│       └── run-history.ts            ← NEW (electron-store wrapper)
├── src/modules/partner-scout/
│   ├── agent/                        ← NEW (folder)
│   │   ├── system-prompt.ts          ← NEW
│   │   ├── schema.ts                 ← NEW
│   │   ├── gemini-schema.ts          ← NEW (responseSchema OpenAPI)
│   │   └── run.ts                    ← NEW
│   ├── data/
│   │   ├── creator-profile.ts        ← NEW
│   │   ├── prospection-run.store.ts  ← NEW
│   │   ├── brand-cache.types.ts      ← NEW
│   │   ├── leads.store.ts            ← DELETE
│   │   ├── sources.config.ts         ← DELETE
│   │   ├── brands.database.ts        ← DELETE
│   │   └── niche-filters.ts          ← DELETE
│   ├── components/
│   │   ├── ScoutDashboard.tsx        ← REWRITE
│   │   ├── LeadCard.tsx              ← REWRITE
│   │   ├── LeadDetail.tsx            ← REWRITE
│   │   └── SourcesConfig.tsx         ← REWRITE
│   ├── scrapers/                     ← DELETE folder
│   ├── scoring/                      ← DELETE folder
│   ├── services/
│   │   ├── pitch-generator.service.ts        ← DELETE
│   │   ├── bundle-recommendation.service.ts  ← DELETE
│   │   └── scheduler.service.ts              ← DELETE
│   ├── utils/
│   │   ├── date.ts                   ← KEEP se reutilizado, senão DELETE
│   │   └── normalize-brand-name.ts   ← NEW
│   └── index.tsx                     ← UPDATE (rota)
├── docs/
│   └── legacy/
│       └── 02-partner-scout-v1.md    ← MOVE de raiz
├── 02-partner-scout.md               ← DELETE (movido)
├── package.json                      ← UPDATE deps
└── README.md                         ← UPDATE seção Partner Scout
```

### Dependências

**Adicionar:**
- `electron-store` (^10) se faltar
- `uuid` + `@types/uuid`
- (NÃO precisa de SDK Gemini — chamadas REST diretas via `fetch` nativo do Node 18+)

**Remover (se não usadas em outro módulo — verificar no plan-phase):**
- `@anthropic-ai/sdk` (não chegou a entrar; só pra confirmar que não está no `package.json`)
- `playwright` / `playwright-core` (era pro tiktok-sponsor scraper)
- `googleapis` (se foi pelo YouTube scraper)

## 10. Estratégia de migração

**Rebuild paralelo + swap atômico:**

1. Construir o novo Partner Scout em `src/modules/partner-scout-v2/` (mesma estrutura), enquanto v1 continua funcional.
2. Verificar end-to-end com run real usando a chave Gemini do ambiente.
3. Commit "swap" único:
   - Move `partner-scout-v2/` → `partner-scout/`
   - Deleta legados listados acima
   - Atualiza rota e README
4. Backup da v1: `02-partner-scout.md` movido pra `docs/legacy/02-partner-scout-v1.md`. Histórico do código preservado pelo git.

**Rollback:** se algo der errado, `git revert` do swap restaura v1.

## 11. Ordem de implementação (10 passos)

1. **Setup deps** — `electron-store`, `uuid`. Remover deps mortas. Build passa.
2. **Schema + types** — `agent/schema.ts`, `agent/gemini-schema.ts`, `agent/run.ts`, `data/brand-cache.types.ts`, `data/creator-profile.ts`. `tsc --noEmit` passa.
3. **Gemini key resolver** — `electron/services/gemini-key-resolver.ts` (env → .env → registro Windows). Testes: 3 cenários de fonte + cenário "nenhuma".
4. **System prompt + builder** — `agent/system-prompt.ts` com texto integral + `buildSystemPrompt(ctx)`. Teste: `agora = new Date('2030-06-15')` → output contém "ANO_ATUAL=2030" e contrato mínimo de 15 google_search.
5. **Brand cache service** — `electron/services/brand-cache.ts`. Testes: upsert, findByName, getActiveSkipList(90d).
6. **Run history service** — `electron/services/run-history.ts`. Testes: append, list (20), get, delete.
7. **Agent runner** — `electron/services/partner-scout-agent.ts`. Loop tool_use via REST streaming SSE, fallback chain de modelo, enforce caps, stream events, cálculo de custo. Smoke test: mock fetch retornando JSON canned.
8. **IPC contract** — `electron/ipc/partnerScout.ts` + `preload.ts`. Testes manuais via DevTools.
9. **Zustand store + UI components** — `data/prospection-run.store.ts` + `ScoutDashboard`, `LeadCard`, `LeadDetail`, `SourcesConfig`. Stub data primeiro, depois ligar nos hooks.
10. **Swap atômico + cleanup** — mover `partner-scout-v2/` → `partner-scout/`, deletar legados, atualizar rota, README, e skill `careca-studio`. Smoke test end-to-end com chave Gemini real.

Cada passo é commitável independentemente. Plan-phase detalhará comandos, testes e critérios de aceite por passo.

## 12. Critérios de aceite (feature complete)

- [ ] App inicia e mostra status "Gemini configurada" se chave existe em alguma das 3 fontes
- [ ] App mostra status "Gemini não configurada" + instruções claras se as 3 fontes vazias
- [ ] Botão "Nova varredura" dispara o agente, mostra log de progresso em tempo real (cada `google_search` e `url_context` aparece)
- [ ] Run real produz `>= 25 marcas` no `resultado_final`
- [ ] Cada marca tem todos os campos do schema preenchidos (ou `null` explícito + `fonte_email: "nao_localizado"`)
- [ ] `executado_em` é a data real, `ano_referencia` é o ano corrente. Validação: editar relógio do sistema pra 2030 → `ano_referencia: 2030` E o agente não cita 2026 nas queries
- [ ] Marca prospectada e marcada como `contatada` aparece na lista de "PULAR" da próxima run dentro de 90 dias, e some depois
- [ ] User edita `email_primario` no `LeadDetail` e a edição persiste no cache
- [ ] Custo da run aparece após terminar (US$, baseado em `usage`) + modelo efetivo (qual da fallback chain foi usado)
- [ ] Dashboard agrupa marcas por `categoria` com TOP 10 destacado
- [ ] Cancelar run no meio salva run parcial com status `aborted`
- [ ] Forçar 429 em `gemini-2.5-flash` → log de progresso mostra "⚠ fallback pra flash-lite" e run continua
- [ ] README seção Partner Scout reflete a nova abordagem (Gemini, sem mencionar scrapers/scoring antigo nem Anthropic)
- [ ] Skill `careca-studio` em `~/.claude/skills/careca-studio/` atualizada pra refletir Partner Scout v2 com Gemini

## 13. README — mudanças

Reescrever a seção do Partner Scout no `README.md` (não o README inteiro):

- "Como funciona" — agente Gemini, google_search nativo, descoberta dinâmica
- "Setup" — chave Gemini lida automaticamente (3 fontes), nada pra configurar na UI; só apontar onde colocar a chave caso ainda não tenha
- "Custos esperados" — ~US$ 1-3/mês com 2-4 runs/semana
- "Stack" — Electron main + Gemini REST API (gemini-2.5-flash com fallback) + google_search + url_context + electron-store

Atualizar a seção "Estrutura" do README com a nova árvore do módulo.

Atualizar a skill `careca-studio` em `C:\Users\João\.claude\skills\careca-studio\SKILL.md` pra refletir Partner Scout como agente LLM Gemini (não scraper, não Claude). **Tarefa explícita no plan-phase.**

## 14. Não-objetivos (YAGNI explícito)

- Sem multi-criador no v1 (`criador` é string fixa "Roberto Careca")
- Sem agendador/cron no v1 (run é manual; cron simples vira opcional v2)
- Sem checkpoint+resume no v1 (loop único; evolução planejada)
- Sem UI pra editar `CreatorProfile` (edição via código + recompile)
- Sem fila de runs paralelos (1 run por vez)
- Sem export do resultado pra Markdown/CSV no v1 (botão "Copiar pitch" individual atende)
- Sem integração com email/CRM no v1 (só catálogo + caminho de contato)
- Sem dashboard de funil de conversão no v1 (telemetria básica de custo só)
- Sem Gemini Caches API no v1 (otimização futura se custo virar problema — ganho marginal pro volume esperado)
- Sem UI pra editar/colar chave Gemini (lida automaticamente; reduz fricção)

---

**Aprovado pra plan-phase em:** 2026-04-25
