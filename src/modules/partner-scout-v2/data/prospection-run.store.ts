import { create } from 'zustand'

import type { ProspectionRun, RunProgressEvent } from '../agent/run.js'
import type { BrandCacheEntry } from './brand-cache.types.js'

export type ScoutTab = 'top' | 'history' | 'cache'

interface PartnerScoutV2State {
  status: 'idle' | 'running' | 'done' | 'error'
  currentRunId: string | null
  currentRun: ProspectionRun | null
  runs: ProspectionRun[]
  cache: BrandCacheEntry[]
  progressLog: RunProgressEvent[]
  tab: ScoutTab
  selectedBrand: string | null
  setTab: (tab: ScoutTab) => void
  selectBrand: (n: string | null) => void
  setStatus: (s: PartnerScoutV2State['status']) => void
  pushProgress: (e: RunProgressEvent) => void
  setCurrentRun: (r: ProspectionRun) => void
  setRuns: (rs: ProspectionRun[]) => void
  setCache: (c: BrandCacheEntry[]) => void
  resetProgress: () => void
}

export const usePartnerScoutV2Store = create<PartnerScoutV2State>((set) => ({
  status: 'idle',
  currentRunId: null,
  currentRun: null,
  runs: [],
  cache: [],
  progressLog: [],
  tab: 'top',
  selectedBrand: null,
  setTab: (tab) => set({ tab }),
  selectBrand: (n) => set({ selectedBrand: n }),
  setStatus: (status) => set({ status }),
  pushProgress: (e) =>
    set((s) => ({ progressLog: [...s.progressLog.slice(-199), e] })),
  setCurrentRun: (r) => set({ currentRun: r, currentRunId: r.id }),
  setRuns: (runs) => set({ runs }),
  setCache: (cache) => set({ cache }),
  resetProgress: () => set({ progressLog: [] }),
}))
