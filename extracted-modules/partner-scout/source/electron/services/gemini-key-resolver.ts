import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

export type ApiKeySource = 'env' | 'clip-splitter-dotenv' | 'windows-registry' | 'nenhuma'

export interface ApiKeyResolution {
  key: string
  source: ApiKeySource
  masked: string
}

const PLACEHOLDERS = new Set([
  'COLE_SUA_CHAVE_AQUI',
  'SUA_CHAVE_AQUI',
  'YOUR_API_KEY',
  'YOUR_GEMINI_API_KEY',
  'INSIRA_SUA_CHAVE_AQUI',
  'CHANGE_ME',
])

export function normalizeApiKey(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '').trim()
  if (!trimmed) return ''
  const upper = trimmed.toUpperCase()
  if (PLACEHOLDERS.has(upper) || upper.includes('CHAVE_AQUI')) return ''
  return trimmed
}

export function parseDotEnvForGeminiKey(filePath: string): string {
  if (!existsSync(filePath)) return ''

  try {
    const content = readFileSync(filePath, 'utf8')
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#') || !line.includes('=')) continue
      const [key, ...valueParts] = line.split('=')
      if (key && key.trim() === 'GEMINI_API_KEY') {
        return normalizeApiKey(valueParts.join('='))
      }
    }
  } catch {
    return ''
  }

  return ''
}

export function readWindowsRegistryGeminiKey(): string {
  if (process.platform !== 'win32') return ''

  try {
    const output = execSync(
      'reg query "HKCU\\Environment" /v GEMINI_API_KEY',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    const match = output.match(/GEMINI_API_KEY\s+REG_(?:EXPAND_)?SZ\s+(.+)/)
    return normalizeApiKey(match?.[1]?.trim() ?? '')
  } catch {
    return ''
  }
}

export function maskApiKey(key: string): string {
  if (key.length <= 10) return '***'
  return `${key.slice(0, 6)}...${key.slice(-5)}`
}

export const DEFAULT_CLIP_SPLITTER_DOTENV = 'D:\\Projetos\\Clip-Splitter\\.env'

export interface ResolveOptions {
  env?: string
  dotEnvPath?: string
  readWindowsRegistryKey?: () => string
}

export function resolveGeminiApiKey(options: ResolveOptions = {}): ApiKeyResolution {
  const envValue = options.env ?? process.env.GEMINI_API_KEY ?? ''
  const dotEnvPath = options.dotEnvPath ?? DEFAULT_CLIP_SPLITTER_DOTENV
  const readRegistry = options.readWindowsRegistryKey ?? readWindowsRegistryGeminiKey

  const fromEnv = normalizeApiKey(envValue)
  if (fromEnv) {
    return { key: fromEnv, source: 'env', masked: maskApiKey(fromEnv) }
  }

  const fromDotEnv = parseDotEnvForGeminiKey(dotEnvPath)
  if (fromDotEnv) {
    return { key: fromDotEnv, source: 'clip-splitter-dotenv', masked: maskApiKey(fromDotEnv) }
  }

  const fromRegistry = normalizeApiKey(readRegistry())
  if (fromRegistry) {
    return { key: fromRegistry, source: 'windows-registry', masked: maskApiKey(fromRegistry) }
  }

  return { key: '', source: 'nenhuma', masked: '' }
}
