import { describe, expect, it, vi } from 'vitest'

import {
  LOCAL_PARTNER_MODEL,
  enrichPartner,
  estimateCostUsd,
  loadSeedPartners,
  runProspection,
  searchPartners,
  type PartnerEnrichmentCacheEntry,
} from './partner-scout-agent.js'
import { ROBERTO_CARECA_PROFILE } from '../../src/modules/partner-scout-v2/data/creator-profile.js'

function retryableResponse(status: number, message: string) {
  return {
    status,
    json: async () => ({ error: { code: status, message } }),
  }
}

function okGeminiResponse(text: string) {
  return {
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
    }),
  }
}

function memoryCache(initial?: PartnerEnrichmentCacheEntry) {
  const entries = new Map<string, PartnerEnrichmentCacheEntry>()
  if (initial) entries.set(initial.brandId, initial)
  return {
    get: (brandId: string) => entries.get(brandId) ?? null,
    set: (brandId: string, entry: PartnerEnrichmentCacheEntry) => entries.set(brandId, entry),
    size: () => entries.size,
  }
}

describe('Partner Scout local discovery', () => {
  it('searchPartners retorna marcas BR relevantes e ordenadas sem IA', () => {
    const result = searchPartners({ onlyBr: true, ativaNoBr: true, minFit: 4 })

    expect(result.length).toBeGreaterThanOrEqual(10)
    expect(result.every((brand) => brand.tem_br && brand.ativa_no_br)).toBe(true)
    expect(result.every((brand) => brand.fit_canal_games >= 4)).toBe(true)
    expect(result[0]!.fit_canal_games).toBeGreaterThanOrEqual(result.at(-1)!.fit_canal_games)
  })

  it('runProspection usa partners.json e nao chama Gemini', async () => {
    const fetchMock = vi.fn()
    const events: string[] = []
    const { run, result, markdown } = await runProspection({
      creator: ROBERTO_CARECA_PROFILE,
      fetchImpl: fetchMock as unknown as typeof fetch,
      onProgress: (event) => events.push(`${event.kind}:${event.detail}`),
    })

    expect(run.status).toBe('done')
    expect(run.error).toBeNull()
    expect(run.usage.modelo_efetivo).toBe(LOCAL_PARTNER_MODEL)
    expect(run.usage.custo_estimado_usd).toBe(0)
    expect(result?.resultado_final.length).toBeGreaterThanOrEqual(10)
    expect(markdown).toContain('Partner Scout')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(events.some((event) => event.includes('Busca local'))).toBe(true)
  })

  it('base inicial tem 20-30 marcas curadas', () => {
    const brands = loadSeedPartners()

    expect(brands.length).toBeGreaterThanOrEqual(20)
    expect(brands.length).toBeLessThanOrEqual(30)
    expect(new Set(brands.map((brand) => brand.id)).size).toBe(brands.length)
  })
})

describe('enrichPartner', () => {
  it('sem API key retorna dados locais com status offline', async () => {
    const outcome = await enrichPartner('razer', {
      apiKey: '',
      clock: () => new Date('2026-04-29T12:00:00Z'),
    })

    expect(outcome.source).toBe('local')
    expect(outcome.aiStatus.status).toBe('offline')
    expect(outcome.message).toContain('base local')
    expect(outcome.prospect.marca).toBe('Razer')
  })

  it('503 no Gemini 2.5 retrya e cai para Gemini 1.5 antes do fallback local', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/gemini-2.5-flash:generateContent')) {
        return retryableResponse(503, 'overloaded')
      }
      return okGeminiResponse(JSON.stringify({
        argumento_pitch: 'Pitch enriquecido para o Roberto.',
        alertas: ['Validar janela comercial.'],
      }))
    })
    const events: string[] = []
    const cache = memoryCache()

    const outcome = await enrichPartner('razer', {
      apiKey: 'AIzaTest',
      fetchImpl: fetchMock as unknown as typeof fetch,
      retryDelayMs: 0,
      cache,
      onProgress: (event) => events.push(`${event.kind}:${event.detail}`),
    })

    expect(outcome.source).toBe('ai')
    expect(outcome.aiStatus.status).toBe('available')
    expect(outcome.prospect.argumento_pitch).toBe('Pitch enriquecido para o Roberto.')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(String(fetchMock.mock.calls[2]![0])).toContain('gemini-1.5-flash')
    expect(events.some((event) => event.includes('retornou 503'))).toBe(true)
    expect(cache.size()).toBe(1)
  })

  it('se todos os modelos falham, fallback local nao vira erro', async () => {
    const fetchMock = vi.fn().mockResolvedValue(retryableResponse(503, 'overloaded'))
    const events: string[] = []

    const outcome = await enrichPartner('razer', {
      apiKey: 'AIzaTest',
      fetchImpl: fetchMock as unknown as typeof fetch,
      retryDelayMs: 0,
      onProgress: (event) => events.push(`${event.kind}:${event.detail}`),
    })

    expect(outcome.source).toBe('local')
    expect(outcome.aiStatus.status).toBe('offline')
    expect(outcome.prospect.marca).toBe('Razer')
    expect(outcome.message).toContain('base local')
    expect(events.some((event) => event.includes('usando dados locais (IA offline)'))).toBe(true)
  })

  it('cache de enriquecimento evita nova chamada por 30 dias', async () => {
    const prospect = (await enrichPartner('razer', { apiKey: '' })).prospect
    const fetchMock = vi.fn()
    const cache = memoryCache({
      brandId: 'razer',
      savedAt: '2026-04-10T12:00:00Z',
      prospect: { ...prospect, argumento_pitch: 'Do cache.' },
    })

    const outcome = await enrichPartner('razer', {
      apiKey: 'AIzaTest',
      fetchImpl: fetchMock as unknown as typeof fetch,
      cache,
      clock: () => new Date('2026-04-29T12:00:00Z'),
    })

    expect(outcome.source).toBe('cache')
    expect(outcome.prospect.argumento_pitch).toBe('Do cache.')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('estimateCostUsd', () => {
  it('modelo local tem custo zero', () => {
    expect(estimateCostUsd({
      prompt_tokens: 100_000,
      candidates_tokens: 10_000,
      tool_use_count: 20,
      modelo_efetivo: LOCAL_PARTNER_MODEL,
    })).toBe(0)
  })
})
