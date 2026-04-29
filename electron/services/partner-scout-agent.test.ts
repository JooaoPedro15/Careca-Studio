import { describe, expect, it, vi } from 'vitest'

import { runProspection, estimateCostUsd } from './partner-scout-agent.js'
import { ROBERTO_CARECA_PROFILE } from '../../src/modules/partner-scout-v2/data/creator-profile.js'

const minimalProspectionResultJson = JSON.stringify({
  executado_em: '2026-04-25T12:00:00Z',
  ano_referencia: 2026,
  janela_temporal_busca: 'jan-jun 2026',
  criador: 'Roberto Careca',
  queries_executadas: ['q1'],
  candidatos_descobertos: 1,
  filtrados: 0,
  resultado_final: [],
  top_10_destaque: [],
  estatisticas_busca: {
    emails_encontrados: 0,
    emails_inferidos: 0,
    emails_nao_localizados: 0,
    categorias_cobertas: 1,
  },
  proximas_acoes_sugeridas: [],
})

function retryableResponse(status: number, message: string) {
  return {
    status,
    headers: { get: (name: string) => (name.toLowerCase() === 'retry-after' ? '0' : null) },
    json: async () => ({ error: { code: status, message } }),
  }
}

function prospectionResultJsonWithBrands(count: number, evergreenCount = 8) {
  return JSON.stringify({
    ...JSON.parse(minimalProspectionResultJson),
    candidatos_descobertos: count,
    resultado_final: Array.from({ length: count }, (_, i) => ({ marca: `Marca ${i + 1}` })),
    marcas_atemporais: Array.from({ length: evergreenCount }, (_, i) => ({ marca: `Atemporal ${i + 1}` })),
    top_10_destaque: Array.from({ length: Math.min(count, 10) }, (_, i) => `Marca ${i + 1}`),
  })
}

describe('runProspection', () => {
  it('happy path — mock retorna texto final, parse passa, status done', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: { role: 'model', parts: [{ text: minimalProspectionResultJson }] },
            finishReason: 'STOP',
            groundingMetadata: { webSearchQueries: ['q1', 'q2'] },
          },
        ],
        usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 500 },
      }),
    })

    const { run, result } = await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      minimumBrands: 0,
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(run.status).toBe('done')
    expect(result).not.toBeNull()
    expect(run.usage.tool_use_count).toBe(2)
    expect(run.usage.prompt_tokens).toBe(1000)
    expect(run.usage.modelo_efetivo).toBe('gemini-2.5-flash')
    expect(run.usage.custo_estimado_usd).toBeGreaterThan(0)
  })

  it('retry — 503 transiente tenta o mesmo modelo de novo antes de cair para fallback', async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return retryableResponse(503, 'overloaded')
      }
      return {
        status: 200,
        json: async () => ({
          candidates: [{ content: { role: 'model', parts: [{ text: minimalProspectionResultJson }] } }],
          usageMetadata: {},
        }),
      }
    })

    const events: string[] = []
    const { run } = await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      minimumBrands: 0,
      fetchImpl: fetchMock as unknown as typeof fetch,
      onProgress: (e) => events.push(`${e.kind}:${e.detail}`),
    })

    expect(run.status).toBe('done')
    expect(run.usage.modelo_efetivo).toBe('gemini-2.5-flash')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(events.some((e) => e.includes('tentativa 2/3'))).toBe(true)
  })

  it('fallback chain — primeiro modelo esgota retries em 429, segundo retorna 200', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/gemini-2.5-flash:generateContent')) {
        return retryableResponse(429, 'rate limit')
      }
      return {
        status: 200,
        json: async () => ({
          candidates: [{ content: { role: 'model', parts: [{ text: minimalProspectionResultJson }] } }],
          usageMetadata: {},
        }),
      }
    })

    const events: string[] = []
    const { run } = await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      minimumBrands: 0,
      fetchImpl: fetchMock as unknown as typeof fetch,
      onProgress: (e) => events.push(`${e.kind}:${e.detail}`),
    })

    expect(run.status).toBe('done')
    expect(run.usage.modelo_efetivo).toBe('gemini-2.5-flash-lite')
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(events.some((e) => e.startsWith('fallback:'))).toBe(true)
  })

  it('resultado curto — pede expansão antes de aceitar o JSON final', async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++
      return {
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              role: 'model',
              parts: [{ text: callCount === 1 ? prospectionResultJsonWithBrands(1) : prospectionResultJsonWithBrands(3) }],
            },
          }],
          usageMetadata: {},
        }),
      }
    })

    const events: string[] = []
    const { run, result } = await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      minimumBrands: 3,
      fetchImpl: fetchMock as unknown as typeof fetch,
      onProgress: (e) => events.push(`${e.kind}:${e.detail}`),
    })

    expect(run.status).toBe('done')
    expect(result?.resultado_final).toHaveLength(3)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(events.some((e) => e.includes('resultado parcial: 1/3 trending'))).toBe(true)
  })

  it('todos os modelos falham — status error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(retryableResponse(429, 'rate limit'))

    const { run } = await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      modelChain: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
      minimumBrands: 0,
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(run.status).toBe('error')
    expect(run.error).toContain('Todos os modelos falharam')
    expect(run.error).toContain('gemini-2.5-flash-lite')
    expect(run.error).toContain('429')
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })

  it('payload legacy — gemini-2.0-flash nao recebe url_context nem maxOutputTokens invalido', async () => {
    interface CapturedGeminiBody {
      systemInstruction: { parts: Array<{ text: string }> }
      tools: unknown[]
      generationConfig: { maxOutputTokens: number }
    }

    let requestBody: CapturedGeminiBody | null = null
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      requestBody = JSON.parse(String(init.body)) as CapturedGeminiBody
      return {
        status: 200,
        json: async () => ({
          candidates: [{ content: { role: 'model', parts: [{ text: minimalProspectionResultJson }] } }],
          usageMetadata: {},
        }),
      }
    })

    await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      modelChain: ['gemini-2.0-flash'],
      minimumBrands: 0,
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(requestBody?.tools).toEqual([{ google_search: {} }])
    expect(requestBody?.generationConfig.maxOutputTokens).toBe(8192)
    expect(requestBody?.systemInstruction.parts[0]?.text).toContain('nao disponibiliza url_context')
  })

  it('JSON parse falha — status error com mensagem clara', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [{ content: { role: 'model', parts: [{ text: 'NÃO É JSON' }] } }],
        usageMetadata: {},
      }),
    })

    const { run, result } = await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      minimumBrands: 0,
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(result).toBeNull()
    expect(run.status).toBe('error')
    expect(run.error).toContain('JSON parse failed')
  })

  it('estimateCostUsd respeita pricing por modelo', () => {
    const cost = estimateCostUsd({
      prompt_tokens: 100_000,
      candidates_tokens: 10_000,
      tool_use_count: 20,
      modelo_efetivo: 'gemini-2.5-flash',
    })
    // 100k * 0.30/M = 0.03 + 10k * 2.50/M = 0.025 + 20 * 0.035 = 0.70
    expect(cost).toBeCloseTo(0.755, 2)
  })
})
