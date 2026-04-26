import { useEffect, useMemo, useRef, useState } from 'react'

import { LeadDetail } from '@/modules/partner-scout/components/LeadDetail'
import { ScoutDashboard } from '@/modules/partner-scout/components/ScoutDashboard'
import { SourcesConfig } from '@/modules/partner-scout/components/SourcesConfig'
import { usePartnerScoutStore } from '@/modules/partner-scout/data/leads.store'
import { isGameNiche } from '@/modules/partner-scout/data/niche-filters'
import { generatePitchForLead } from '@/modules/partner-scout/services/pitch-generator.service'
import { buildDailyLeadDigest } from '@/modules/partner-scout/services/scheduler.service'

type ScoutScreen = 'dashboard' | 'sources'

export function PartnerScoutModule() {
  const didBootstrapRef = useRef(false)
  const [screen, setScreen] = useState<ScoutScreen>('dashboard')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const leads = usePartnerScoutStore((state) => state.leads)
  const selectedLeadId = usePartnerScoutStore((state) => state.selectedLeadId)
  const filters = usePartnerScoutStore((state) => state.filters)
  const sourcesConfig = usePartnerScoutStore((state) => state.sourcesConfig)
  const generatedPitch = usePartnerScoutStore((state) => state.generatedPitch)
  const dailySummary = usePartnerScoutStore((state) => state.dailySummary)
  const setLeads = usePartnerScoutStore((state) => state.setLeads)
  const setSelectedLead = usePartnerScoutStore((state) => state.setSelectedLead)
  const patchFilters = usePartnerScoutStore((state) => state.patchFilters)
  const markLeadAsContacted = usePartnerScoutStore((state) => state.markLeadAsContacted)
  const updateSourcesConfig = usePartnerScoutStore((state) => state.updateSourcesConfig)
  const setGeneratedPitch = usePartnerScoutStore((state) => state.setGeneratedPitch)

  useEffect(() => {
    if (filters.targetChannel !== 'main') {
      patchFilters({ targetChannel: 'main' })
    }

    if (filters.niche !== 'all' && !isGameNiche(filters.niche)) {
      patchFilters({ niche: 'all' })
    }

    if (filters.timingSignal === 'season_launch') {
      patchFilters({ timingSignal: 'all' })
    }
  }, [filters.niche, filters.targetChannel, filters.timingSignal, patchFilters])

  async function refreshDigest() {
    setIsRefreshing(true)

    try {
      const officialYoutubeSignals = await window.careca.partnerScout.fetchOfficialYoutubeSignals().catch(() => [])
      const digest = buildDailyLeadDigest(sourcesConfig, officialYoutubeSignals)
      setLeads(digest.leads, digest.summary)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (didBootstrapRef.current) {
      return
    }

    didBootstrapRef.current = true
    void refreshDigest()
  }, [])

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (filters.targetChannel !== 'all' && lead.targetChannel !== filters.targetChannel) {
        return false
      }

      if (filters.niche !== 'all' && lead.niche !== filters.niche) {
        return false
      }

      if (filters.ticketBand !== 'all' && lead.ticketBand !== filters.ticketBand) {
        return false
      }

      if (filters.timingSignal !== 'all' && lead.timingSignal !== filters.timingSignal) {
        return false
      }

      return true
    })
  }, [filters, leads])

  const selectedLead = filteredLeads.find((lead) => lead.id === selectedLeadId) ?? filteredLeads[0] ?? null

  useEffect(() => {
    if (!selectedLeadId && filteredLeads[0]) {
      setSelectedLead(filteredLeads[0].id)
    }
  }, [filteredLeads, selectedLeadId, setSelectedLead])

  const content = {
    dashboard: (
      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <ScoutDashboard
          leads={filteredLeads}
          selectedLeadId={selectedLead?.id ?? null}
          filters={filters}
          summary={dailySummary}
          isRefreshing={isRefreshing}
          onSelectLead={setSelectedLead}
          onPatchFilters={patchFilters}
          onGeneratePitch={(lead) => setGeneratedPitch(generatePitchForLead(lead))}
          onMarkContacted={markLeadAsContacted}
          onOpenSources={() => setScreen('sources')}
          onRefresh={refreshDigest}
        />
        <LeadDetail lead={selectedLead} pitch={generatedPitch} onGeneratePitch={(lead) => setGeneratedPitch(generatePitchForLead(lead))} />
      </div>
    ),
    sources: (
      <SourcesConfig
        config={sourcesConfig}
        onBack={() => setScreen('dashboard')}
        onChange={updateSourcesConfig}
      />
    ),
  }[screen]

  return <div className="min-h-0">{content}</div>
}
