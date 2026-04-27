import { randomUUID } from 'node:crypto'

import type { CreatorProfile } from '../../src/modules/partner-scout-v2/data/creator-profile.js'
import type { BrandCacheEntry } from '../../src/modules/partner-scout-v2/data/brand-cache.types.js'
import type {
  ProspectionRun,
  RunProgressEvent,
  RunUsage,
} from '../../src/modules/partner-scout-v2/agent/run.js'
import type { ProspectionResult } from '../../src/modules/partner-scout-v2/agent/schema.js'
import { GEMINI_PROSPECTION_SCHEMA } from '../../src/modules/partner-scout-v2/agent/gemini-schema.js'
import { buildSystemPrompt } from '../../src/modules/partner-scout-v2/agent/system-prompt.js'

export const GEMINI_MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
] as const

// Pricing por 1M tokens (Apr 2026 — confirmar antes de prod).
const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },
}
const GROUNDING_COST_PER_REQUEST = 35 / 1000  // $35 / 1k requests

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
  modelChain?: readonly string[]
  maxToolCalls?: number
  timeoutMs?: number
  signal?: AbortSignal
  onProgress?: (event: RunProgressEvent) => void
  fetchImpl?: typeof fetch
}

export interface RunOutcome {
  run: ProspectionRun
  result: ProspectionResult | null
}

const DEFAULT_MAX_TOOL_CALLS = 50
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

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
  error?: { code: number; message: string }
}

function makeUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
}

function buildRequestBody(systemPrompt: string, conversation: GeminiContent[]) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: conversation,
    tools: [{ google_search: {} }, { url_context: {} }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_PROSPECTION_SCHEMA,
      maxOutputTokens: 16384,
      temperature: 0.4,
    },
  }
}

async function callGeminiOnce(
  model: string,
  apiKey: string,
  body: unknown,
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
): Promise<{ status: number; data: GeminiResponse }> {
  const response = await fetchImpl(makeUrl(model, apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  const data = (await response.json()) as GeminiResponse
  return { status: response.status, data }
}

export async function runProspection(options: RunOptions): Promise<RunOutcome> {
  const {
    apiKey,
    creator,
    cacheHints,
    modelChain = GEMINI_MODEL_FALLBACK_CHAIN,
    maxToolCalls = DEFAULT_MAX_TOOL_CALLS,
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

  const systemPrompt = buildSystemPrompt({ creator, agora: new Date(), cacheHints })

  const usage: RunUsage = {
    prompt_tokens: 0,
    candidates_tokens: 0,
    cached_content_tokens: 0,
    tool_use_count: 0,
    modelo_efetivo: modelChain[0]!,
    custo_estimado_usd: 0,
  }

  const conversation: GeminiContent[] = [
    { role: 'user', parts: [{ text: 'Inicie o processo de prospecção conforme o system prompt. Produza o JSON final no schema.' }] },
  ]

  let finalText: string | null = null
  let lastError: string | null = null

  modelLoop: for (const model of modelChain) {
    usage.modelo_efetivo = model
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
        conversation.push({
          role: 'user',
          parts: [{ text: `LIMITE DE ${maxToolCalls} TOOL CALLS ATINGIDO. Finalize agora com o JSON do que você já tem, no schema exato.` }],
        })
      }

      const body = buildRequestBody(systemPrompt, conversation)
      const { status, data } = await callGeminiOnce(model, apiKey, body, abortCtl.signal, fetchImpl)

      if (status === 429 || status === 503) {
        emit({ ts: new Date().toISOString(), kind: 'fallback', detail: `⚠ ${model} retornou ${status}` })
        lastError = `${status}: ${data.error?.message ?? 'rate limit'}`
        continue modelLoop
      }
      if (status >= 400 || data.error) {
        lastError = data.error?.message ?? `HTTP ${status}`
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

      // sem function calls = resposta final
      const textPart = parts.find((p) => p.text)?.text ?? ''
      if (!textPart) {
        lastError = 'resposta sem texto e sem function calls'
        emit({ ts: new Date().toISOString(), kind: 'error', detail: lastError })
        break modelLoop
      }

      finalText = textPart
      lastError = null
      break modelLoop
    }
  }

  clearTimeout(timeoutHandle)

  let result: ProspectionResult | null = null
  if (finalText) {
    try {
      result = JSON.parse(finalText) as ProspectionResult
    } catch (e) {
      lastError = `JSON parse failed: ${(e as Error).message}`
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

  return { run, result }
}
