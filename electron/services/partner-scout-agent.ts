import { randomUUID } from 'node:crypto'

import type { CreatorProfile } from '../../src/modules/partner-scout-v2/data/creator-profile.js'
import type { BrandCacheEntry } from '../../src/modules/partner-scout-v2/data/brand-cache.types.js'
import type {
  ProspectionRun,
  RunProgressEvent,
  RunUsage,
} from '../../src/modules/partner-scout-v2/agent/run.js'
import type { ProspectionResult } from '../../src/modules/partner-scout-v2/agent/schema.js'
import {
  buildSystemPrompt,
  type EvergreenHint,
} from '../../src/modules/partner-scout-v2/agent/system-prompt.js'
import { resultToMarkdown } from '../../src/modules/partner-scout-v2/agent/result-to-markdown.js'

export const GEMINI_MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
] as const

// Pricing por 1M tokens (Apr 2026 — confirmar antes de prod).
const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },
}
const GROUNDING_COST_PER_REQUEST = 35 / 1000  // $35 / 1k requests
const DEFAULT_MAX_OUTPUT_TOKENS = 65_536
const MAX_RETRYABLE_HTTP_RETRIES = 2
const MAX_RETRY_DELAY_SEC = 60
const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 503, 504])

const MODEL_CAPABILITIES: Record<string, { maxOutputTokens: number; supportsUrlContext: boolean }> = {
  'gemini-2.5-flash': { maxOutputTokens: 65_536, supportsUrlContext: true },
  'gemini-2.5-flash-lite': { maxOutputTokens: 65_536, supportsUrlContext: true },
  'gemini-2.5-pro': { maxOutputTokens: 65_536, supportsUrlContext: true },
  // Legacy fallback only when explicitly passed via modelChain.
  'gemini-2.0-flash': { maxOutputTokens: 8_192, supportsUrlContext: false },
}

export function estimateCostUsd(usage: Pick<RunUsage, 'prompt_tokens' | 'candidates_tokens' | 'tool_use_count' | 'modelo_efetivo'>): number {
  const p = PRICING[usage.modelo_efetivo] ?? PRICING['gemini-2.5-flash']!
  const inputCost = (usage.prompt_tokens / 1_000_000) * p.input
  const outputCost = (usage.candidates_tokens / 1_000_000) * p.output
  const groundingCost = usage.tool_use_count * GROUNDING_COST_PER_REQUEST
  return Number((inputCost + outputCost + groundingCost).toFixed(4))
}

export interface RunOptions {
  apiKey: string
  creator: CreatorProfile
  cacheHints: BrandCacheEntry[]
  evergreenAnterior?: EvergreenHint[]
  modelChain?: readonly string[]
  maxToolCalls?: number
  minimumBrands?: number
  timeoutMs?: number
  signal?: AbortSignal
  onProgress?: (event: RunProgressEvent) => void
  fetchImpl?: typeof fetch
}

export interface RunOutcome {
  run: ProspectionRun
  result: ProspectionResult | null
  markdown: string | null
}

const DEFAULT_MAX_TOOL_CALLS = 120
const DEFAULT_MINIMUM_BRANDS = 40
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000
const MAX_NUDGES = 2
const MAX_RESULT_EXPANSION_NUDGES = 2

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface GeminiPart {
  text?: string
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
}

interface GeminiCandidate {
  content?: GeminiContent
  finishReason?: string
  groundingMetadata?: { webSearchQueries?: string[] }
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    cachedContentTokenCount?: number
  }
  error?: {
    code: number
    message: string
    status?: string
    details?: Array<{ '@type'?: string; retryDelay?: string }>
  }
}

function makeUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
}

function getModelCapabilities(model: string): { maxOutputTokens: number; supportsUrlContext: boolean } {
  return MODEL_CAPABILITIES[model] ?? {
    maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS,
    supportsUrlContext: true,
  }
}

function buildRuntimeSystemPrompt(systemPrompt: string, model: string): string {
  const capabilities = getModelCapabilities(model)
  if (capabilities.supportsUrlContext) return systemPrompt

  return `${systemPrompt}

---

NOTA DO RUNTIME: o modelo ${model} nao disponibiliza url_context nesta chamada. Use apenas google_search para descobrir, validar e chegar a fontes publicas; nao tente chamar url_context.`
}

function buildRequestBody(systemPrompt: string, conversation: GeminiContent[], model: string) {
  const capabilities = getModelCapabilities(model)
  const tools: Array<Record<string, Record<string, never>>> = [{ google_search: {} }]
  if (capabilities.supportsUrlContext) {
    tools.push({ url_context: {} })
  }

  // Gemini não permite responseMimeType: 'application/json' + responseSchema JUNTO com tools
  // (google_search/url_context). São mutuamente exclusivos. Por isso pedimos JSON em texto
  // livre via prompt e parseamos no parseJsonOutput abaixo.
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: conversation,
    tools,
    generationConfig: {
      maxOutputTokens: Math.min(DEFAULT_MAX_OUTPUT_TOKENS, capabilities.maxOutputTokens),
      temperature: 0.4,
    },
  }
}

// Extrai JSON do texto: aceita JSON puro OU dentro de ```json ... ``` (com ou sem newline).
function parseJsonOutput(text: string): { ok: true; value: ProspectionResult } | { ok: false; error: string } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1] ?? text).trim()
  try {
    return { ok: true, value: JSON.parse(candidate) as ProspectionResult }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

function buildExpansionPrompt(currentCount: number, minimumBrands: number, evergreenCount: number): string {
  return `O JSON parcial trouxe apenas ${currentCount}/${minimumBrands} marcas em resultado_final${evergreenCount < 8 ? ` e ${evergreenCount}/8 em marcas_atemporais` : ''}. Continue a prospecção agora antes de finalizar.

Regras para a próxima resposta:
- Preserve as marcas boas já encontradas e expanda resultado_final para pelo menos ${minimumBrands} marcas.
- Garanta pelo menos 8 marcas em marcas_atemporais (energéticos, periféricos, lojas de games, plataformas streaming/anime, publishers AAA evergreen).
- Rode novas buscas em categorias pouco cobertas: hardware/periféricos, publishers AAA/indie/mobile, telecom, fintech, energia/snacks, apps, áudio/tech consumer, marcas asiáticas entrando no Brasil, rankings de patrocinadores BR.
- Lembrete: na dúvida INCLUA com alerta. Só elimine quem realmente não opera no BR.
- Para cada nova marca, preencha plano_parceria completo.
- Não retorne texto explicativo; só retorne o JSON final completo dentro de \`\`\`json ... \`\`\`.`
}

async function callGeminiOnce(
  model: string,
  apiKey: string,
  body: unknown,
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
): Promise<{ status: number; data: GeminiResponse; retryAfter: string | null }> {
  const response = await fetchImpl(makeUrl(model, apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  const retryAfter = typeof response.headers?.get === 'function' ? response.headers.get('retry-after') : null
  let data: GeminiResponse = {}
  try {
    data = (await response.json()) as GeminiResponse
  } catch {
    data = {}
  }
  return { status: response.status, data, retryAfter }
}

function parseDelaySeconds(value: string): number | null {
  const trimmed = value.trim()
  const secondsMatch = trimmed.match(/^([\d.]+)s?$/i)
  if (secondsMatch) {
    const seconds = Number(secondsMatch[1])
    return Number.isFinite(seconds) ? seconds : null
  }

  const dateMs = Date.parse(trimmed)
  if (Number.isNaN(dateMs)) return null

  return Math.max(0, (dateMs - Date.now()) / 1000)
}

function retryDelayFromError(error: GeminiResponse['error'] | undefined): number | null {
  for (const detail of error?.details ?? []) {
    if (typeof detail.retryDelay === 'string') {
      const parsed = parseDelaySeconds(detail.retryDelay)
      if (parsed !== null) return parsed
    }
  }

  const retryMatch = error?.message.match(/retry in ([\d.]+)s/i)
  if (!retryMatch) return null

  const seconds = Number(retryMatch[1])
  return Number.isFinite(seconds) ? seconds : null
}

function retryDelaySec(status: number, retryAfter: string | null, error: GeminiResponse['error'] | undefined, retryNumber: number): number {
  const fromHeader = retryAfter ? parseDelaySeconds(retryAfter) : null
  const fromError = retryDelayFromError(error)
  const hintedDelay = fromHeader ?? fromError
  if (hintedDelay !== null) {
    return Math.min(Math.max(hintedDelay, 0), MAX_RETRY_DELAY_SEC)
  }

  const baseDelay = status === 429 ? 4 : 5
  return Math.min(baseDelay * 2 ** (retryNumber - 1), MAX_RETRY_DELAY_SEC)
}

function formatDelay(seconds: number): string {
  return Number.isInteger(seconds) ? String(seconds) : seconds.toFixed(1)
}

function waitForRetry(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  if (signal.aborted) return Promise.reject(signal.reason ?? new Error('aborted'))

  return new Promise((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout>
    const done = () => {
      signal.removeEventListener('abort', aborted)
      resolve()
    }
    const aborted = () => {
      clearTimeout(timeout)
      reject(signal.reason ?? new Error('aborted'))
    }
    timeout = setTimeout(done, ms)
    signal.addEventListener('abort', aborted, { once: true })
  })
}

async function callGeminiWithRetries(
  model: string,
  apiKey: string,
  body: unknown,
  signal: AbortSignal,
  fetchImpl: typeof fetch,
  emit: (event: RunProgressEvent) => void,
): Promise<{ status: number; data: GeminiResponse }> {
  let retryNumber = 0

  for (;;) {
    const response = await callGeminiOnce(model, apiKey, body, signal, fetchImpl)
    if (!RETRYABLE_HTTP_STATUSES.has(response.status) || retryNumber >= MAX_RETRYABLE_HTTP_RETRIES) {
      return response
    }

    retryNumber += 1
    const waitSec = retryDelaySec(response.status, response.retryAfter, response.data.error, retryNumber)
    emit({
      ts: new Date().toISOString(),
      kind: 'fallback',
      detail: `${model} retornou ${response.status}, aguardando ${formatDelay(waitSec)}s e tentando de novo (tentativa ${retryNumber + 1}/${MAX_RETRYABLE_HTTP_RETRIES + 1})`,
    })
    await waitForRetry(waitSec * 1000, signal)
  }
}

export async function runProspection(options: RunOptions): Promise<RunOutcome> {
  const {
    apiKey,
    creator,
    cacheHints,
    evergreenAnterior,
    modelChain = GEMINI_MODEL_FALLBACK_CHAIN,
    maxToolCalls = DEFAULT_MAX_TOOL_CALLS,
    minimumBrands = DEFAULT_MINIMUM_BRANDS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    onProgress,
    fetchImpl = fetch,
  } = options

  const id = randomUUID()
  const startedAt = new Date().toISOString()
  const progressLog: RunProgressEvent[] = []

  const emit = (event: RunProgressEvent) => {
    progressLog.push(event)
    onProgress?.(event)
  }

  const abortCtl = new AbortController()
  const timeoutHandle = setTimeout(() => abortCtl.abort(new Error('timeout')), timeoutMs)
  externalSignal?.addEventListener('abort', () => abortCtl.abort(externalSignal.reason))

  const systemPrompt = buildSystemPrompt({ creator, agora: new Date(), cacheHints, evergreenAnterior })

  const usage: RunUsage = {
    prompt_tokens: 0,
    candidates_tokens: 0,
    cached_content_tokens: 0,
    tool_use_count: 0,
    modelo_efetivo: modelChain[0]!,
    custo_estimado_usd: 0,
  }

  const conversation: GeminiContent[] = [
    {
      role: 'user',
      parts: [{
        text: 'Inicie o processo de prospecção conforme o system prompt. Quando finalizar, retorne SOMENTE o JSON final dentro de um bloco ```json ... ```, sem texto antes ou depois. O JSON deve seguir exatamente o schema descrito no system prompt.',
      }],
    },
  ]

  let finalText: string | null = null
  let lastError: string | null = null
  let nudgesUsed = 0
  let expansionNudgesUsed = 0
  let toolLimitNoticeSent = false
  const modelErrors: string[] = []

  modelLoop: for (const model of modelChain) {
    usage.modelo_efetivo = model
    const runtimeSystemPrompt = buildRuntimeSystemPrompt(systemPrompt, model)
    if (model !== modelChain[0]) {
      emit({ ts: new Date().toISOString(), kind: 'fallback', detail: `⚠ tentando modelo ${model}` })
    }

    let iteration = 0
    while (iteration++ < maxToolCalls + 5) {
      if (abortCtl.signal.aborted) {
        lastError = 'aborted'
        break modelLoop
      }
      if (usage.tool_use_count >= maxToolCalls) {
        if (!toolLimitNoticeSent) {
          toolLimitNoticeSent = true
          conversation.push({
            role: 'user',
            parts: [{ text: `LIMITE DE ${maxToolCalls} TOOL CALLS ATINGIDO. Finalize agora com o JSON mais completo que você já tem, no schema exato. Se ainda houver menos de ${minimumBrands} marcas, expanda com candidatas verificadas nas buscas já feitas e registre alertas onde houver incerteza.` }],
          })
        }
      }

      const body = buildRequestBody(runtimeSystemPrompt, conversation, model)
      let response: { status: number; data: GeminiResponse }
      try {
        response = await callGeminiWithRetries(model, apiKey, body, abortCtl.signal, fetchImpl, emit)
      } catch (e) {
        lastError = abortCtl.signal.aborted ? 'aborted' : ((e as Error).message || 'Gemini request failed')
        if (lastError !== 'aborted') {
          emit({ ts: new Date().toISOString(), kind: 'error', detail: lastError })
        }
        break modelLoop
      }

      const { status, data } = response

      if (RETRYABLE_HTTP_STATUSES.has(status)) {
        const errMsg = data.error?.message ?? `HTTP ${status}`
        emit({ ts: new Date().toISOString(), kind: 'fallback', detail: `⚠ ${model} retornou ${status}` })
        lastError = `${status}: ${errMsg}`
        modelErrors.push(`${model}: ${lastError}`)
        continue modelLoop
      }
      if (status >= 400 || data.error) {
        lastError = data.error?.message ?? `HTTP ${status}`
        modelErrors.push(`${model}: ${status}: ${lastError}`)
        emit({ ts: new Date().toISOString(), kind: 'error', detail: lastError })
        break modelLoop
      }

      const meta = data.usageMetadata ?? {}
      usage.prompt_tokens = meta.promptTokenCount ?? usage.prompt_tokens
      usage.candidates_tokens = meta.candidatesTokenCount ?? usage.candidates_tokens
      usage.cached_content_tokens = meta.cachedContentTokenCount ?? usage.cached_content_tokens

      const candidate = data.candidates?.[0]
      if (!candidate) {
        lastError = 'no candidate in Gemini response'
        emit({ ts: new Date().toISOString(), kind: 'error', detail: lastError })
        break modelLoop
      }

      const parts = candidate.content?.parts ?? []
      const functionCalls = parts.filter((p) => p.functionCall)

      // grounding queries (google_search faz por baixo dos panos, sem function call explícita)
      const groundingQueries = candidate.groundingMetadata?.webSearchQueries ?? []
      for (const q of groundingQueries) {
        usage.tool_use_count += 1
        emit({ ts: new Date().toISOString(), kind: 'tool_use', detail: `🔍 google_search: "${q}"` })
      }

      if (functionCalls.length > 0) {
        // url_context retorna como function_call que precisa de function_response do nosso lado
        conversation.push({ role: 'model', parts })
        const responseParts: GeminiPart[] = functionCalls.map((p) => {
          const name = p.functionCall!.name
          usage.tool_use_count += 1
          emit({
            ts: new Date().toISOString(),
            kind: 'tool_use',
            detail: `📄 ${name}: ${JSON.stringify(p.functionCall!.args)}`,
          })
          return {
            functionResponse: {
              name,
              response: { ack: true },
            },
          }
        })
        conversation.push({ role: 'user', parts: responseParts })
        continue
      }

      // sem function calls = pode ser resposta final OU modelo se confundiu e respondeu texto
      const textPart = parts.find((p) => p.text)?.text ?? ''
      const finishReason = candidate.finishReason ?? 'UNSPECIFIED'
      if (!textPart) {
        // Casos comuns: MAX_TOKENS (output truncado), SAFETY (bloqueado), parts vazio após grounding
        const reason = `parts vazio (finishReason=${finishReason})`
        lastError = reason
        emit({ ts: new Date().toISOString(), kind: 'fallback', detail: `⚠ ${model}: ${reason} — tentando próximo modelo` })
        modelErrors.push(`${model}: ${reason}`)
        continue modelLoop
      }

      // Detecta se o texto contém JSON (cru ou em code fence). Se sim, é resposta final.
      const looksLikeJson = /```json\b|^\s*\{/m.test(textPart)
      if (looksLikeJson) {
        const parsedPreview = parseJsonOutput(textPart)
        const currentCount = parsedPreview.ok ? parsedPreview.value.resultado_final?.length ?? 0 : 0
        const evergreenCount = parsedPreview.ok ? parsedPreview.value.marcas_atemporais?.length ?? 0 : 0
        const needsMoreTrending = minimumBrands > 0 && currentCount < minimumBrands
        const needsMoreEvergreen = minimumBrands > 0 && evergreenCount < 8
        if (
          parsedPreview.ok &&
          (needsMoreTrending || needsMoreEvergreen) &&
          expansionNudgesUsed < MAX_RESULT_EXPANSION_NUDGES
        ) {
          expansionNudgesUsed += 1
          emit({
            ts: new Date().toISOString(),
            kind: 'phase',
            detail: `resultado parcial: ${currentCount}/${minimumBrands} trending + ${evergreenCount}/8 atemporais; expansão #${expansionNudgesUsed}`,
          })
          conversation.push({ role: 'model', parts })
          conversation.push({
            role: 'user',
            parts: [{ text: buildExpansionPrompt(currentCount, minimumBrands, evergreenCount) }],
          })
          continue
        }

        finalText = textPart
        lastError = null
        break modelLoop
      }

      // Modelo respondeu conversacionalmente sem usar tools. Nudge e continua.
      if (nudgesUsed >= MAX_NUDGES) {
        lastError = `modelo retornou texto não-JSON após ${MAX_NUDGES} nudges`
        emit({ ts: new Date().toISOString(), kind: 'error', detail: lastError })
        finalText = textPart  // salva pra debug, mesmo que parse falhe
        break modelLoop
      }
      nudgesUsed += 1
      emit({ ts: new Date().toISOString(), kind: 'phase', detail: `🔁 nudge #${nudgesUsed}: modelo não usou tools, pedindo pra começar` })
      conversation.push({ role: 'model', parts })
      conversation.push({
        role: 'user',
        parts: [{
          text: 'Você ainda não chamou google_search. NÃO responda em texto agora. COMECE a executar o processo: chame google_search com a primeira query da Fase 1 (descoberta ampla). Só retorne o JSON final dentro de ```json ... ``` quando tiver concluído as 5 fases.',
        }],
      })
    }
  }

  clearTimeout(timeoutHandle)

  if (!finalText && lastError !== 'aborted' && modelErrors.length > 1) {
    lastError = `Todos os modelos falharam: ${modelErrors.join(' | ')}`
  }

  let result: ProspectionResult | null = null
  if (finalText) {
    const parsed = parseJsonOutput(finalText)
    if (parsed.ok) {
      result = parsed.value
    } else {
      lastError = `JSON parse failed: ${parsed.error}`
      emit({ ts: new Date().toISOString(), kind: 'error', detail: lastError })
    }
  }

  usage.custo_estimado_usd = estimateCostUsd(usage)

  const finishedAt = new Date().toISOString()
  const status = lastError === 'aborted' ? 'aborted' : result ? 'done' : 'error'

  const run: ProspectionRun = {
    id,
    startedAt,
    finishedAt,
    status,
    error: lastError,
    usage,
    result,
    progressLog,
  }

  const markdown = result ? resultToMarkdown(result) : null

  return { run, result, markdown }
}
