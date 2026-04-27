import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createBrandCache, type BrandCache } from './brand-cache.js'
import type { MarcaProspectada } from '../../src/modules/partner-scout-v2/agent/schema.js'

const FIXED_NOW = '2026-04-25T12:00:00.000Z'
const fixedClock = () => new Date(FIXED_NOW)

const stubMarca = (override: Partial<MarcaProspectada> = {}): MarcaProspectada => ({
  marca: 'Razer',
  categoria: 'Hardware',
  site: 'razer.com',
  operacao_brasil: 'confirmada',
  ultima_atividade_publica: '2026-03-01',
  porte: 'global',
  campanhas_recentes_creator: [],
  lancamentos_proximos: [],
  fit_demografico: { score: 8, justificativa: 'fit alto' },
  tipo_publi_recomendado: 'short_patrocinado',
  ticket_estimado_brl: { minimo: 5000, ideal: 10000, premium: 18000, base_calculo: 'cpm gaming br' },
  contato: {
    email_primario: 'mkt@razer.com',
    email_alternativo: null,
    fonte_email: 'razer.com/contato',
    editavel: true,
    linkedin_decisor: { nome: null, cargo: null, url: null },
    agencia_representante: null,
    formulario_parcerias: null,
  },
  argumento_pitch: 'pitch específico',
  alertas: [],
  ...override,
})

describe('BrandCache', () => {
  let dir: string
  let cache: BrandCache

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'brand-cache-'))
    cache = createBrandCache({ cwd: dir, name: 'test', clock: fixedClock })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('upsertFromRun cria entry novo com primeira_descoberta = ultima_descoberta = agora', () => {
    cache.upsertFromRun(stubMarca())
    const entry = cache.findByName('razer')
    expect(entry).not.toBeNull()
    expect(entry!.primeira_descoberta).toBe(FIXED_NOW)
    expect(entry!.ultima_descoberta).toBe(FIXED_NOW)
    expect(entry!.status).toBe('descoberta')
    expect(entry!.nome_display).toBe('Razer')
  })

  it('upsertFromRun em entry existente atualiza ultima_descoberta e ultimo_enriquecimento, preserva primeira_descoberta e status', () => {
    cache.upsertFromRun(stubMarca())
    cache.setStatus('razer', 'a_contatar')

    const newClock = () => new Date('2026-05-10T00:00:00.000Z')
    const cache2 = createBrandCache({ cwd: dir, name: 'test', clock: newClock })
    cache2.upsertFromRun(stubMarca({ argumento_pitch: 'pitch atualizado' }))

    const entry = cache2.findByName('razer')
    expect(entry!.primeira_descoberta).toBe(FIXED_NOW)
    expect(entry!.ultima_descoberta).toBe('2026-05-10T00:00:00.000Z')
    expect(entry!.status).toBe('a_contatar')
    expect(entry!.ultimo_enriquecimento.argumento_pitch).toBe('pitch atualizado')
  })

  it('setStatus atualiza status e status_atualizado_em', () => {
    cache.upsertFromRun(stubMarca())
    cache.setStatus('razer', 'contatada', 'enviei email em 25/04')

    const entry = cache.findByName('razer')
    expect(entry!.status).toBe('contatada')
    expect(entry!.status_atualizado_em).toBe(FIXED_NOW)
    expect(entry!.notas[0]?.text).toContain('25/04')
  })

  it('updateContact aplica patch parcial em contato', () => {
    cache.upsertFromRun(stubMarca())
    cache.updateContact('razer', { email_primario: 'novo@razer.com' })

    const entry = cache.findByName('razer')
    expect(entry!.ultimo_enriquecimento.contato.email_primario).toBe('novo@razer.com')
  })

  it('addNote adiciona nota livre com timestamp', () => {
    cache.upsertFromRun(stubMarca())
    cache.addNote('razer', 'lembrete: follow up em 30d')

    const entry = cache.findByName('razer')
    expect(entry!.notas).toHaveLength(1)
    expect(entry!.notas[0]?.text).toBe('lembrete: follow up em 30d')
    expect(entry!.notas[0]?.ts).toBe(FIXED_NOW)
  })

  it('getActiveSkipList(90) retorna apenas entries com status "ativo" dentro da janela', () => {
    cache.upsertFromRun(stubMarca({ marca: 'Marca Antiga' }))
    cache.setStatus('marca antiga', 'contatada')

    cache.upsertFromRun(stubMarca({ marca: 'Marca Nova Descoberta' }))
    // status fica 'descoberta' por padrão — NÃO entra na skip list

    cache.upsertFromRun(stubMarca({ marca: 'Marca a Contatar' }))
    cache.setStatus('marca a contatar', 'a_contatar')
    // 'a_contatar' NÃO entra na skip list

    const skip = cache.getActiveSkipList(90)
    const names = skip.map((e) => e.nome_normalizado)
    expect(names).toContain('marca antiga')
    expect(names).not.toContain('marca nova descoberta')
    expect(names).not.toContain('marca a contatar')
  })

  it('getActiveSkipList(90) ignora entries com status_atualizado_em > 90 dias atrás', () => {
    cache.upsertFromRun(stubMarca())
    cache.setStatus('razer', 'rejeitada')

    // simula passagem de 100 dias
    const futureClock = () => new Date('2026-08-03T00:00:00.000Z')  // FIXED_NOW + 100d
    const cache2 = createBrandCache({ cwd: dir, name: 'test', clock: futureClock })
    const skip = cache2.getActiveSkipList(90)
    expect(skip).toHaveLength(0)
  })

  it('list retorna entries ordenados por ultima_descoberta desc', () => {
    cache.upsertFromRun(stubMarca({ marca: 'Antiga' }))
    const cache2 = createBrandCache({
      cwd: dir,
      name: 'test',
      clock: () => new Date('2026-05-01T00:00:00.000Z'),
    })
    cache2.upsertFromRun(stubMarca({ marca: 'Recente' }))

    const list = cache2.list()
    expect(list[0]?.nome_normalizado).toBe('recente')
    expect(list[1]?.nome_normalizado).toBe('antiga')
  })

  it('persiste entre instâncias (escreve no disco)', () => {
    cache.upsertFromRun(stubMarca())

    const cache2 = createBrandCache({ cwd: dir, name: 'test', clock: fixedClock })
    expect(cache2.findByName('razer')).not.toBeNull()
  })
})
