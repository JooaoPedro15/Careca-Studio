import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  normalizeApiKey,
  parseDotEnvForGeminiKey,
  resolveGeminiApiKey,
} from './gemini-key-resolver.js'

describe('normalizeApiKey', () => {
  it('retorna string vazia pra placeholders comuns', () => {
    expect(normalizeApiKey('COLE_SUA_CHAVE_AQUI')).toBe('')
    expect(normalizeApiKey('YOUR_GEMINI_API_KEY')).toBe('')
    expect(normalizeApiKey('CHANGE_ME')).toBe('')
    expect(normalizeApiKey('"INSIRA_SUA_CHAVE_AQUI"')).toBe('')
  })

  it('retorna string vazia pra qualquer valor contendo CHAVE_AQUI', () => {
    expect(normalizeApiKey('MINHA_CHAVE_AQUI')).toBe('')
  })

  it('remove aspas e espaços e retorna a chave', () => {
    expect(normalizeApiKey(' "AIzaSyABC123" ')).toBe('AIzaSyABC123')
    expect(normalizeApiKey("'AIzaSyXYZ'")).toBe('AIzaSyXYZ')
  })

  it('retorna string vazia pra entradas vazias/null', () => {
    expect(normalizeApiKey('')).toBe('')
    expect(normalizeApiKey('   ')).toBe('')
  })
})

describe('parseDotEnvForGeminiKey', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'gem-key-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('retorna chave válida do .env', () => {
    const envPath = path.join(tmpDir, '.env')
    writeFileSync(envPath, 'OUTRA_VAR=foo\nGEMINI_API_KEY=AIzaReal123\n')
    expect(parseDotEnvForGeminiKey(envPath)).toBe('AIzaReal123')
  })

  it('ignora linhas comentadas', () => {
    const envPath = path.join(tmpDir, '.env')
    writeFileSync(envPath, '# GEMINI_API_KEY=ignorada\nGEMINI_API_KEY=AIzaUsada\n')
    expect(parseDotEnvForGeminiKey(envPath)).toBe('AIzaUsada')
  })

  it('retorna string vazia se chave for placeholder', () => {
    const envPath = path.join(tmpDir, '.env')
    writeFileSync(envPath, 'GEMINI_API_KEY=COLE_SUA_CHAVE_AQUI\n')
    expect(parseDotEnvForGeminiKey(envPath)).toBe('')
  })

  it('retorna string vazia se arquivo não existe', () => {
    expect(parseDotEnvForGeminiKey(path.join(tmpDir, 'inexistente.env'))).toBe('')
  })
})

describe('resolveGeminiApiKey', () => {
  const originalEnv = process.env.GEMINI_API_KEY

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.GEMINI_API_KEY
    } else {
      process.env.GEMINI_API_KEY = originalEnv
    }
    vi.restoreAllMocks()
  })

  it('prioriza process.env quando existe e é válida', () => {
    process.env.GEMINI_API_KEY = 'AIzaFromEnv'
    const result = resolveGeminiApiKey({
      dotEnvPath: '/inexistente.env',
      readWindowsRegistryKey: () => 'AIzaFromRegistry',
    })
    expect(result.key).toBe('AIzaFromEnv')
    expect(result.source).toBe('env')
  })

  it('cai pro .env se env vazia', () => {
    delete process.env.GEMINI_API_KEY
    const tmp = mkdtempSync(path.join(tmpdir(), 'gem-key-'))
    const envPath = path.join(tmp, '.env')
    writeFileSync(envPath, 'GEMINI_API_KEY=AIzaFromDotEnv\n')

    const result = resolveGeminiApiKey({
      dotEnvPath: envPath,
      readWindowsRegistryKey: () => 'AIzaFromRegistry',
    })
    expect(result.key).toBe('AIzaFromDotEnv')
    expect(result.source).toBe('clip-splitter-dotenv')

    rmSync(tmp, { recursive: true, force: true })
  })

  it('cai pro registro Windows se env e .env vazios', () => {
    delete process.env.GEMINI_API_KEY
    const result = resolveGeminiApiKey({
      dotEnvPath: '/inexistente.env',
      readWindowsRegistryKey: () => 'AIzaFromRegistry',
    })
    expect(result.key).toBe('AIzaFromRegistry')
    expect(result.source).toBe('windows-registry')
  })

  it('retorna nenhuma se as 3 fontes falham', () => {
    delete process.env.GEMINI_API_KEY
    const result = resolveGeminiApiKey({
      dotEnvPath: '/inexistente.env',
      readWindowsRegistryKey: () => '',
    })
    expect(result.key).toBe('')
    expect(result.source).toBe('nenhuma')
  })

  it('mascara chave em maskApiKey', () => {
    const result = resolveGeminiApiKey({
      env: 'AIzaSyABCDEFGHIJKLMNOPQRSTU',
      dotEnvPath: '/inexistente.env',
      readWindowsRegistryKey: () => '',
    })
    expect(result.masked).toBe('AIzaSy...QRSTU')
  })
})
