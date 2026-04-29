import { useEffect, useState } from 'react'

import { ScoutDashboard } from './components/ScoutDashboard.js'
import { LeadDetail } from './components/LeadDetail.js'
import { SourcesConfig } from './components/SourcesConfig.js'
import { usePartnerScoutV2Store } from './data/prospection-run.store.js'
import type { MarcaProspectada } from './agent/schema.js'
import type { BrandStatus } from './data/brand-cache.types.js'
import type { PartnerAiStatus } from './data/partner-database.types.js'
import { normalizeBrandName } from './utils/normalize-brand-name.js'

type Screen = 'dashboard' | 'settings'

export function PartnerScoutModuleV2() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [openMarca, setOpenMarca] = useState<MarcaProspectada | null>(null)
  const [aiStatus, setAiStatus] = useState<PartnerAiStatus | null>(null)
  const [enrichingBrandId, setEnrichingBrandId] = useState<string | null>(null)

  const status = usePartnerScoutV2Store((s) => s.status)
  const currentRun = usePartnerScoutV2Store((s) => s.currentRun)
  const runs = usePartnerScoutV2Store((s) => s.runs)
  const cache = usePartnerScoutV2Store((s) => s.cache)
  const progressLog = usePartnerScoutV2Store((s) => s.progressLog)
  const tab = usePartnerScoutV2Store((s) => s.tab)
  const setTab = usePartnerScoutV2Store((s) => s.setTab)
  const setStatus = usePartnerScoutV2Store((s) => s.setStatus)
  const pushProgress = usePartnerScoutV2Store((s) => s.pushProgress)
  const setCurrentRun = usePartnerScoutV2Store((s) => s.setCurrentRun)
  const setRuns = usePartnerScoutV2Store((s) => s.setRuns)
  const setCache = usePartnerScoutV2Store((s) => s.setCache)
  const resetProgress = usePartnerScoutV2Store((s) => s.resetProgress)

  useEffect(() => {
    void window.careca.partnerScout.listRuns().then(setRuns)
    void window.careca.partnerScout.listCache().then(setCache)
    void window.careca.partnerScout.getAiStatus().then(setAiStatus)

    const offProgress = window.careca.partnerScout.onProgress(pushProgress)
    const offAiStatus = window.careca.partnerScout.onAiStatus(setAiStatus)
    const offDone = window.careca.partnerScout.onDone((run) => {
      setCurrentRun(run)
      setStatus('done')
      void window.careca.partnerScout.listRuns().then(setRuns)
      void window.careca.partnerScout.listCache().then(setCache)
    })
    const offError = window.careca.partnerScout.onError(() => setStatus('error'))

    return () => {
      offProgress()
      offAiStatus()
      offDone()
      offError()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onRun = async () => {
    resetProgress()
    setStatus('running')
    try {
      await window.careca.partnerScout.run()
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
  }

  const onAbort = () => void window.careca.partnerScout.abort()

  const onMarkContact = async (m: MarcaProspectada) => {
    await window.careca.partnerScout.setBrandStatus(normalizeBrandName(m.marca), 'a_contatar' satisfies BrandStatus)
    void window.careca.partnerScout.listCache().then(setCache)
  }

  const brandIdFor = (m: MarcaProspectada) =>
    normalizeBrandName(m.marca).replace(/\s+/g, '-')

  const replaceMarcaInRun = (run: typeof currentRun, marca: MarcaProspectada) => {
    if (!run?.result) return run
    const same = (item: MarcaProspectada) => normalizeBrandName(item.marca) === normalizeBrandName(marca.marca)
    return {
      ...run,
      result: {
        ...run.result,
        resultado_final: run.result.resultado_final.map((item) => same(item) ? marca : item),
        marcas_atemporais: run.result.marcas_atemporais.map((item) => same(item) ? marca : item),
      },
    }
  }

  const onEnrich = async (m: MarcaProspectada) => {
    const brandId = brandIdFor(m)
    setEnrichingBrandId(brandId)
    try {
      const outcome = await window.careca.partnerScout.enrichPartner(brandId)
      setAiStatus(outcome.aiStatus)
      setOpenMarca(outcome.prospect)
      const updatedRun = replaceMarcaInRun(currentRun, outcome.prospect)
      if (updatedRun) setCurrentRun(updatedRun)
      void window.careca.partnerScout.listCache().then(setCache)
    } catch (e) {
      console.error(e)
      pushProgress({
        ts: new Date().toISOString(),
        kind: 'fallback',
        detail: 'usando dados locais (IA offline): enriquecimento indisponivel',
      })
    } finally {
      setEnrichingBrandId(null)
    }
  }

  if (screen === 'settings') {
    return <SourcesConfig onBack={() => setScreen('dashboard')} />
  }

  return (
    <div className="min-h-0">
      <ScoutDashboard
        status={status}
        currentRun={currentRun}
        runs={runs}
        cache={cache}
        progressLog={progressLog}
        aiStatus={aiStatus}
        tab={tab}
        onTab={setTab}
        onRun={onRun}
        onAbort={onAbort}
        onSelectMarca={setOpenMarca}
        onMarkContact={onMarkContact}
        onOpenSettings={() => setScreen('settings')}
      />
      <LeadDetail
        marca={openMarca}
        onClose={() => setOpenMarca(null)}
        onSaveContact={(patch) => {
          if (openMarca) {
            void window.careca.partnerScout.updateBrandContact(normalizeBrandName(openMarca.marca), patch)
            void window.careca.partnerScout.listCache().then(setCache)
          }
        }}
        onSetStatus={(s, nota) => {
          if (openMarca) {
            void window.careca.partnerScout.setBrandStatus(normalizeBrandName(openMarca.marca), s, nota)
            void window.careca.partnerScout.listCache().then(setCache)
          }
        }}
        onEnrich={onEnrich}
        isEnriching={openMarca ? enrichingBrandId === brandIdFor(openMarca) : false}
        aiStatus={aiStatus}
      />
    </div>
  )
}
