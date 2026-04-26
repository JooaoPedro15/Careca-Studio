import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { defaultSourcesConfig } from '@/modules/partner-scout/data/sources.config'
import type { SourcesConfig } from '@/modules/partner-scout/data/sources.config'
import type { AcceptedNiche, LeadTab, TargetChannel, TicketBand, TimingSignal } from '@/modules/partner-scout/data/niche-filters'
import type { FitScore } from '@/modules/partner-scout/scoring/fit-calculator'

export interface LeadEvidence {
  id: string
  label: string
  date: string
  type: 'campaign' | 'release' | 'job'
}

export interface CampaignHistoryItem {
  id: string
  summary: string
  sourceChannel: string
  date: string
}

export interface Lead {
  id: string
  brand: string
  website: string
  marketingContact: string
  niche: AcceptedNiche
  targetChannel: TargetChannel
  confidence: number
  reasoning: string
  ticketBand: TicketBand
  estimatedTicket: number
  timingSignal: TimingSignal
  timingLabel: string
  audienceFitLabel: string
  audienceFitReasoning: string
  priority: 'hot' | 'warm' | 'watch'
  whyNow: string
  launchTitle: string | null
  launchDate: string | null
  launchLabel: string
  launchEvidence: string
  recommendedBundleName: string
  recommendedAngle: string
  recommendedNextStep: string
  score: FitScore
  lastSignalAt: string
  evidences: LeadEvidence[]
  campaignHistory: CampaignHistoryItem[]
  similarChannels: string[]
  contacted: boolean
  contactedAt: string | null
  isRecurrentOpportunity: boolean
  isGameAdaptation: boolean
  reviewRequired: boolean
}

export interface GeneratedPitch {
  leadId: string
  bundleId: string
  bundleName: string
  template: 'completo' | 'games' | 'streaming'
  subject: string
  proactive: string
  reactive: string
  attachmentLabel: string
}

export interface LeadFilters {
  targetChannel: LeadTab
  niche: 'all' | AcceptedNiche
  ticketBand: 'all' | TicketBand
  timingSignal: 'all' | TimingSignal
}

export interface DailySummary {
  total: number
  main: number
  react: number
  hot: number
  warm: number
  watch: number
  launching: number
  message: string
  generatedAt: string
  referenceDate: string
  audienceSnapshot: string
}

interface PartnerScoutState {
  leads: Lead[]
  selectedLeadId: string | null
  filters: LeadFilters
  sourcesConfig: SourcesConfig
  generatedPitch: GeneratedPitch | null
  dailySummary: DailySummary | null
  setLeads: (leads: Lead[], summary: DailySummary) => void
  setSelectedLead: (leadId: string) => void
  patchFilters: (patch: Partial<LeadFilters>) => void
  markLeadAsContacted: (leadId: string) => void
  updateSourcesConfig: (updater: (current: SourcesConfig) => SourcesConfig) => void
  setGeneratedPitch: (pitch: GeneratedPitch | null) => void
}

const defaultFilters: LeadFilters = {
  targetChannel: 'main',
  niche: 'all',
  ticketBand: 'all',
  timingSignal: 'all',
}

export const usePartnerScoutStore = create<PartnerScoutState>()(
  persist(
    (set) => ({
      leads: [],
      selectedLeadId: null,
      filters: defaultFilters,
      sourcesConfig: defaultSourcesConfig,
      generatedPitch: null,
      dailySummary: null,
      setLeads: (leads, summary) =>
        set({
          leads,
          dailySummary: summary,
          selectedLeadId: leads[0]?.id ?? null,
          generatedPitch: null,
        }),
      setSelectedLead: (leadId) => set({ selectedLeadId: leadId }),
      patchFilters: (patch) =>
        set((state) => ({
          filters: {
            ...state.filters,
            ...patch,
          },
        })),
      markLeadAsContacted: (leadId) =>
        set((state) => ({
          leads: state.leads.map((lead) =>
            lead.id === leadId ? { ...lead, contacted: true, contactedAt: new Date().toISOString() } : lead,
          ),
        })),
      updateSourcesConfig: (updater) =>
        set((state) => ({
          sourcesConfig: updater(state.sourcesConfig),
        })),
      setGeneratedPitch: (pitch) => set({ generatedPitch: pitch }),
    }),
    {
      name: 'careca-studio:partner-scout:v2',
      partialize: (state) => ({
        filters: state.filters,
        sourcesConfig: state.sourcesConfig,
      }),
    },
  ),
)
