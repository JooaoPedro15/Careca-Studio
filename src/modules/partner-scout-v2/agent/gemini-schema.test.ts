import { describe, expect, it } from 'vitest'
import { GEMINI_PROSPECTION_SCHEMA } from './gemini-schema.js'

describe('GEMINI_PROSPECTION_SCHEMA', () => {
  it('é um OBJECT com todos os campos top-level required', () => {
    expect(GEMINI_PROSPECTION_SCHEMA.type).toBe('OBJECT')
    expect(GEMINI_PROSPECTION_SCHEMA.required).toContain('resultado_final')
    expect(GEMINI_PROSPECTION_SCHEMA.required).toContain('executado_em')
  })

  it('cada item de resultado_final tem todos os 14 campos do MarcaProspectada', () => {
    const itemSchema = GEMINI_PROSPECTION_SCHEMA.properties.resultado_final.items
    expect(itemSchema.required).toEqual(
      expect.arrayContaining([
        'marca',
        'categoria',
        'site',
        'operacao_brasil',
        'ultima_atividade_publica',
        'porte',
        'campanhas_recentes_creator',
        'lancamentos_proximos',
        'fit_demografico',
        'tipo_publi_recomendado',
        'ticket_estimado_brl',
        'contato',
        'argumento_pitch',
        'alertas',
      ]),
    )
  })

  it('lancamentos_proximos é ARRAY de OBJECT com titulo/data_prevista/tipo', () => {
    const lp = GEMINI_PROSPECTION_SCHEMA.properties.resultado_final.items.properties.lancamentos_proximos
    expect(lp.type).toBe('ARRAY')
    expect(lp.items.required).toEqual(['titulo', 'data_prevista', 'tipo'])
    expect(lp.items.properties.tipo.enum).toEqual(['jogo', 'produto', 'evento', 'temporada'])
  })

  it('contato.editavel é BOOLEAN required', () => {
    const contato = GEMINI_PROSPECTION_SCHEMA.properties.resultado_final.items.properties.contato
    expect(contato.required).toContain('editavel')
    expect(contato.properties.editavel.type).toBe('BOOLEAN')
  })
})
