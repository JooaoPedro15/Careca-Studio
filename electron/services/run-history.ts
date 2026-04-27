import Store from 'electron-store'

import type { ProspectionRun } from '../../src/modules/partner-scout-v2/agent/run.js'

interface RunHistoryStoreSchema {
  runs: Record<string, ProspectionRun>
}

export interface CreateRunHistoryOptions {
  cwd?: string
  name?: string
  maxRuns?: number
}

export interface RunHistory {
  append: (run: ProspectionRun) => void
  update: (id: string, patch: Partial<ProspectionRun>) => void
  get: (id: string) => ProspectionRun | null
  list: () => ProspectionRun[]
  delete: (id: string) => void
  clear: () => void
}

export function createRunHistory(options: CreateRunHistoryOptions = {}): RunHistory {
  const maxRuns = options.maxRuns ?? 20
  const store = new Store<RunHistoryStoreSchema>({
    name: options.name ?? 'partner-scout-runs',
    cwd: options.cwd,
    defaults: { runs: {} },
  })

  const getRuns = () => store.get('runs')
  const setRuns = (r: Record<string, ProspectionRun>) => store.set('runs', r)

  const enforceLimit = (runs: Record<string, ProspectionRun>) => {
    const sorted = Object.values(runs).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    const keep = sorted.slice(0, maxRuns)
    const next: Record<string, ProspectionRun> = {}
    for (const r of keep) next[r.id] = r
    return next
  }

  return {
    append(run) {
      const runs = getRuns()
      runs[run.id] = run
      setRuns(enforceLimit(runs))
    },
    update(id, patch) {
      const runs = getRuns()
      const existing = runs[id]
      if (!existing) return
      runs[id] = { ...existing, ...patch }
      setRuns(runs)
    },
    get(id) {
      return getRuns()[id] ?? null
    },
    list() {
      return Object.values(getRuns()).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    },
    delete(id) {
      const runs = getRuns()
      delete runs[id]
      setRuns(runs)
    },
    clear() {
      setRuns({})
    },
  }
}
