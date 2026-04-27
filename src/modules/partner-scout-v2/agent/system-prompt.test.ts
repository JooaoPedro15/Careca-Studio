import { describe, expect, it } from 'vitest'

import { ROBERTO_CARECA_PROFILE } from '../data/creator-profile.js'
import type { BrandCacheEntry } from '../data/brand-cache.types.js'
import { buildSystemPrompt } from './system-prompt.js'

const stubMarca = {} as never

const makeCacheEntry = (override: Partial<BrandCacheEntry> = {}): BrandCacheEntry => ({
  nome_normalizado: 'razer',
  nome_display: 'Razer',
  primeira_descoberta: '2026-01-01T00:00:00Z',
  ultima_descoberta: '2026-04-01T00:00:00Z',
  status: 'contatada',
  status_atualizado_em: '2026-04-01T00:00:00Z',
  ultimo_email_usado: 'mkt@razer.com',
  notas: [],
  ultimo_enriquecimento: stubMarca,
  ...override,
})

describe('buildSystemPrompt', () => {
  it('resolve ANO_ATUAL/ANO_ANTERIOR/ANO_PROXIMO baseado em agora', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date('2030-06-15T12:00:00Z'),
      cacheHints: [],
    })

    expect(prompt).toContain('ANO_ATUAL=2030')
    expect(prompt).toContain('ANO_ANTERIOR=2029')
    expect(prompt).toContain('ANO_PROXIMO=2031')
  })

  it('inclui o YAML do criador com inscritos', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date(),
      cacheHints: [],
    })

    expect(prompt).toContain('Roberto Careca')
    expect(prompt).toContain('inscritos: 405000')
  })

  it('lista marcas em cache pra pular quando há entries ativos', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date('2026-04-25T00:00:00Z'),
      cacheHints: [
        makeCacheEntry({ nome_display: 'Razer', status: 'contatada' }),
        makeCacheEntry({ nome_normalizado: 'monster', nome_display: 'Monster Energy', status: 'rejeitada' }),
      ],
    })

    expect(prompt).toContain('PULAR')
    expect(prompt).toContain('Razer (status=contatada')
    expect(prompt).toContain('Monster Energy (status=rejeitada')
  })

  it('mostra mensagem clara quando não há marcas em cache', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date(),
      cacheHints: [],
    })

    expect(prompt).toContain('(nenhuma marca em cache)')
  })

  it('declara as ferramentas Gemini (google_search e url_context) e o contrato mínimo', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date(),
      cacheHints: [],
    })

    expect(prompt).toContain('google_search')
    expect(prompt).toContain('url_context')
    expect(prompt).toContain('CONTRATO DE EXECUÇÃO MÍNIMO')
    expect(prompt).toContain('mínimo 15 vezes')
    expect(prompt).toContain('mínimo 30 candidatos')
    expect(prompt).toContain('mínimo 25 marcas')
  })

  it('contém o texto integral do system prompt original (anti-padrões, fases, score composto)', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date(),
      cacheHints: [],
    })

    expect(prompt).toContain('PARTNER SCOUT')
    expect(prompt).toContain('REGRA TEMPORAL')
    expect(prompt).toContain('Fase 1')
    expect(prompt).toContain('Fase 5')
    expect(prompt).toContain('ANTI-PADRÕES')
    expect(prompt).toContain('score composto')
  })

  it('declara a REGRA DE LANÇAMENTOS pra publishers/plataformas/hardware', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date(),
      cacheHints: [],
    })

    expect(prompt).toContain('REGRA DE LANÇAMENTOS')
    expect(prompt).toContain('lancamentos_proximos')
    expect(prompt).toContain('publisher')
    expect(prompt).toContain('argumento_pitch')
  })
})
