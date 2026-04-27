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
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(run.status).toBe('done')
    expect(result).not.toBeNull()
    expect(run.usage.tool_use_count).toBe(2)
    expect(run.usage.prompt_tokens).toBe(1000)
    expect(run.usage.modelo_efetivo).toBe('gemini-2.5-flash')
    expect(run.usage.custo_estimado_usd).toBeGreaterThan(0)
  })

  it('fallback chain — primeiro modelo retorna 429, segundo retorna 200', async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return {
          status: 429,
          json: async () => ({ error: { code: 429, message: 'rate limit' } }),
        }
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
      fetchImpl: fetchMock as unknown as typeof fetch,
      onProgress: (e) => events.push(`${e.kind}:${e.detail}`),
    })

    expect(run.status).toBe('done')
    expect(run.usage.modelo_efetivo).toBe('gemini-2.0-flash')
    // (chain agora é flash → 2.0-flash → flash-lite, fallback pula pra 2.0-flash quando flash retorna 429 sem retryAfter)
    expect(events.some((e) => e.startsWith('fallback:'))).toBe(true)
  })

  it('todos os modelos falham — status error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 429,
      json: async () => ({ error: { code: 429, message: 'rate limit' } }),
    })

    const { run } = await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(run.status).toBe('error')
    expect(run.error).toContain('429')
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
