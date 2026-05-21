import Store from 'electron-store'

import type {
  BrandCacheEntry,
  BrandStatus,
} from '../../src/modules/partner-scout/data/brand-cache.types.js'
import { BRAND_STATUS_ATIVO } from '../../src/modules/partner-scout/data/brand-cache.types.js'
import type {
  ContatoMarca,
  MarcaProspectada,
} from '../../src/modules/partner-scout/agent/schema.js'
import { normalizeBrandName } from '../../src/modules/partner-scout/utils/normalize-brand-name.js'

interface BrandCacheStoreSchema {
  entries: Record<string, BrandCacheEntry>
}

export interface CreateBrandCacheOptions {
  cwd?: string
  name?: string
  clock?: () => Date
}

export interface BrandCache {
  findByName: (name: string) => BrandCacheEntry | null
  list: () => BrandCacheEntry[]
  upsertFromRun: (marca: MarcaProspectada) => BrandCacheEntry
  setStatus: (normalized: string, status: BrandStatus, nota?: string) => BrandCacheEntry
  updateContact: (normalized: string, patch: Partial<ContatoMarca>) => BrandCacheEntry
  addNote: (normalized: string, text: string) => BrandCacheEntry
  getActiveSkipList: (windowDays: number) => BrandCacheEntry[]
  clear: () => void
}

export function createBrandCache(options: CreateBrandCacheOptions = {}): BrandCache {
  const clock = options.clock ?? (() => new Date())
  const store = new Store<BrandCacheStoreSchema>({
    name: options.name ?? 'partner-scout-cache',
    cwd: options.cwd,
    defaults: { entries: {} },
  })

  const getEntries = (): Record<string, BrandCacheEntry> => store.get('entries')
  const setEntries = (e: Record<string, BrandCacheEntry>) => store.set('entries', e)

  const requireEntry = (normalized: string): BrandCacheEntry => {
    const entry = getEntries()[normalized]
    if (!entry) throw new Error(`Brand cache: entry "${normalized}" não encontrada`)
    return entry
  }

  return {
    findByName(name) {
      const key = normalizeBrandName(name)
      return getEntries()[key] ?? null
    },

    list() {
      return Object.values(getEntries()).sort((a, b) =>
        b.ultima_descoberta.localeCompare(a.ultima_descoberta),
      )
    },

    upsertFromRun(marca) {
      const now = clock().toISOString()
      const normalized = normalizeBrandName(marca.marca)
      const entries = getEntries()
      const existing = entries[normalized]

      const next: BrandCacheEntry = existing
        ? {
            ...existing,
            ultima_descoberta: now,
            ultimo_enriquecimento: marca,
          }
        : {
            nome_normalizado: normalized,
            nome_display: marca.marca,
            primeira_descoberta: now,
            ultima_descoberta: now,
            status: 'descoberta',
            status_atualizado_em: now,
            ultimo_email_usado: null,
            notas: [],
            ultimo_enriquecimento: marca,
          }

      entries[normalized] = next
      setEntries(entries)
      return next
    },

    setStatus(normalized, status, nota) {
      const now = clock().toISOString()
      const entries = getEntries()
      const entry = requireEntry(normalized)
      const updated: BrandCacheEntry = {
        ...entry,
        status,
        status_atualizado_em: now,
        notas: nota ? [...entry.notas, { ts: now, text: nota }] : entry.notas,
      }
      entries[normalized] = updated
      setEntries(entries)
      return updated
    },

    updateContact(normalized, patch) {
      const entries = getEntries()
      const entry = requireEntry(normalized)
      const updated: BrandCacheEntry = {
        ...entry,
        ultimo_enriquecimento: {
          ...entry.ultimo_enriquecimento,
          contato: { ...entry.ultimo_enriquecimento.contato, ...patch },
        },
        ultimo_email_usado: patch.email_primario ?? entry.ultimo_email_usado,
      }
      entries[normalized] = updated
      setEntries(entries)
      return updated
    },

    addNote(normalized, text) {
      const now = clock().toISOString()
      const entries = getEntries()
      const entry = requireEntry(normalized)
      const updated: BrandCacheEntry = {
        ...entry,
        notas: [...entry.notas, { ts: now, text }],
      }
      entries[normalized] = updated
      setEntries(entries)
      return updated
    },

    getActiveSkipList(windowDays) {
      const cutoff = clock().getTime() - windowDays * 24 * 60 * 60 * 1000
      return Object.values(getEntries()).filter((e) => {
        if (!BRAND_STATUS_ATIVO.includes(e.status)) return false
        const ts = new Date(e.status_atualizado_em).getTime()
        return ts >= cutoff
      })
    },

    clear() {
      setEntries({})
    },
  }
}
