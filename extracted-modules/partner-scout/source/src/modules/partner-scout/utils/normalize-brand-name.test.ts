import { describe, expect, it } from 'vitest'
import { normalizeBrandName } from './normalize-brand-name.js'

describe('normalizeBrandName', () => {
  it('lowercase', () => {
    expect(normalizeBrandName('Razer')).toBe('razer')
  })

  it('remove acentos', () => {
    expect(normalizeBrandName('Açaí')).toBe('acai')
    expect(normalizeBrandName('Café Pelé')).toBe('cafe pele')
  })

  it('remove pontuação e domínios', () => {
    expect(normalizeBrandName('razer.com')).toBe('razer')
    expect(normalizeBrandName('Razer Inc.')).toBe('razer inc')
    expect(normalizeBrandName('Logitech G®')).toBe('logitech g')
  })

  it('colapsa espaços múltiplos', () => {
    expect(normalizeBrandName('  Hyper   X  ')).toBe('hyper x')
  })

  it('"Razer" e "Razer Brasil" colidem propositalmente apenas se forem iguais — testa só normalização, não dedup', () => {
    expect(normalizeBrandName('Razer Brasil')).toBe('razer brasil')
    expect(normalizeBrandName('Razer')).toBe('razer')
  })
})
