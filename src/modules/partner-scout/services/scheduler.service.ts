import type { MediaKitData } from '@/modules/media-kit/data/mediakit.schema'
import { loadMediaKitData } from '@/modules/media-kit/services/storage.service'
import { findBrandProfile } from '@/modules/partner-scout/data/brands.database'
import type { DailySummary, Lead, LeadEvidence } from '@/modules/partner-scout/data/leads.store'
import { gameNicheList, isGameNiche } from '@/modules/partner-scout/data/niche-filters'
import type { SourcesConfig } from '@/modules/partner-scout/data/sources.config'
import type { TimingSignal } from '@/modules/partner-scout/data/niche-filters'
import { calculateAudienceFit } from '@/modules/partner-scout/scoring/audience-fit'
import { calculateFitScore } from '@/modules/partner-scout/scoring/fit-calculator'
import { classifyLead } from '@/modules/partner-scout/scoring/niche-classifier'
import { estimateTicket } from '@/modules/partner-scout/scoring/ticket-estimator'
import { detectTimingSignal } from '@/modules/partner-scout/scoring/timing-detector'
import { scrapeUpcomingGameReleases } from '@/modules/partner-scout/scrapers/game-release.scraper'
import { scrapeLinkedInJobs } from '@/modules/partner-scout/scrapers/linkedin-jobs.scraper'
import { scrapeYoutubeSponsors } from '@/modules/partner-scout/scrapers/youtube-sponsor.scraper'
import { resolveBundleRecommendation } from '@/modules/partner-scout/services/bundle-recommendation.service'
import { getPartnerScoutToday } from '@/modules/partner-scout/utils/date'

interface LaunchSignal {
  title: string
  date: string
  label: string
  type: 'release' | 'official'
}

interface LeadAccumulator {
  brand: string
  keywords: Set<string>
  sponsorDates: string[]
  releaseDates: string[]
  officialSignalDates: string[]
  jobDates: string[]
  launches: LaunchSignal[]
  evidences: LeadEvidence[]
  campaignHistory: Lead['campaignHistory']
  similarChannels: Set<string>
}

export interface OfficialYoutubeSignal {
  brand: string
  publishedAt: string
  title: string
  url: string
  evidence: string
  keywords: string[]
}

function getLeadId(brand: string): string {
  return brand.toLowerCase().replaceAll(/\s+/g, '-')
}

function isLead(value: Lead | null): value is Lead {
  return value !== null
}

function formatReferenceDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function formatLaunchDate(date: string | null): string {
  if (!date) {
    return 'sem data'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(date))
}

function getYouthShare(profile: MediaKitData['audience']['main']): number {
  return profile.ageRanges
    .filter((item) => item.range === '13-17' || item.range === '18-24')
    .reduce((total, item) => total + item.percent, 0)
}

function buildAudienceSnapshot(mediaKit: MediaKitData): string {
  const mainYouthShare = getYouthShare(mediaKit.audience.main)
  const mainTopics = mediaKit.audience.main.interests.slice(0, 3).join(', ')

  return `Publico games: ${mainYouthShare}% entre 13-24 com interesses em ${mainTopics}.`
}

function isImmediateTiming(signal: TimingSignal): boolean {
  return signal === 'launch_30d' || signal === 'competitor_7d' || signal === 'job_open'
}

function isCurrentTiming(signal: TimingSignal): boolean {
  return signal !== 'none'
}

function getPriorityRank(priority: Lead['priority']): number {
  if (priority === 'hot') {
    return 3
  }

  if (priority === 'warm') {
    return 2
  }

  return 1
}

function pickPrimaryLaunch(launches: LaunchSignal[], today: Date): LaunchSignal | null {
  const futureRelease = launches
    .filter((launch) => launch.type === 'release' && new Date(launch.date).getTime() >= today.getTime())
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())[0]

  if (futureRelease) {
    return futureRelease
  }

  const recentOfficial = launches
    .filter((launch) => launch.type === 'official')
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0]

  if (recentOfficial) {
    return recentOfficial
  }

  return launches.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0] ?? null
}

function compareLeads(left: Lead, right: Lead): number {
  const priorityDiff = getPriorityRank(right.priority) - getPriorityRank(left.priority)

  if (priorityDiff !== 0) {
    return priorityDiff
  }

  const launchDiff = Number(Boolean(right.launchTitle)) - Number(Boolean(left.launchTitle))

  if (launchDiff !== 0) {
    return launchDiff
  }

  const audienceDiff = right.score.audienceFit - left.score.audienceFit

  if (audienceDiff !== 0) {
    return audienceDiff
  }

  const timingDiff = right.score.timingScore - left.score.timingScore

  if (timingDiff !== 0) {
    return timingDiff
  }

  const totalDiff = right.score.total - left.score.total

  if (totalDiff !== 0) {
    return totalDiff
  }

  return new Date(right.lastSignalAt).getTime() - new Date(left.lastSignalAt).getTime()
}

export function buildDailyLeadDigest(
  config: SourcesConfig,
  officialYoutubeSignals: OfficialYoutubeSignal[] = [],
): { leads: Lead[]; summary: DailySummary } {
  const today = getPartnerScoutToday()
  const referenceDate = formatReferenceDate(today)
  const mediaKit = loadMediaKitData()
  const enabledNiches = new Set(gameNicheList.filter((niche) => config.nicheToggles[niche]))
  const gameChannelNames = new Set(config.gameChannels.filter((item) => item.enabled).map((item) => item.name))
  const buckets = new Map<string, LeadAccumulator>()

  function ensureBucket(brand: string): LeadAccumulator {
    const bucket = buckets.get(brand)

    if (bucket) {
      return bucket
    }

    const created: LeadAccumulator = {
      brand,
      keywords: new Set<string>(),
      sponsorDates: [],
      releaseDates: [],
      officialSignalDates: [],
      jobDates: [],
      launches: [],
      evidences: [],
      campaignHistory: [],
      similarChannels: new Set<string>(),
    }
    buckets.set(brand, created)
    return created
  }

  scrapeYoutubeSponsors()
    .filter((item) => gameChannelNames.has(item.sourceChannel))
    .forEach((item) => {
      const bucket = ensureBucket(item.brand)
      item.keywords.forEach((keyword) => bucket.keywords.add(keyword))
      bucket.sponsorDates.push(item.date)
      bucket.similarChannels.add(item.sourceChannel)
      bucket.evidences.push({ id: `${item.brand}-${item.date}`, label: item.evidence, date: item.date, type: 'campaign' })
      bucket.campaignHistory.push({
        id: `${item.brand}-${item.sourceChannel}-${item.date}`,
        summary: item.evidence,
        sourceChannel: item.sourceChannel,
        date: item.date,
      })
    })

  scrapeUpcomingGameReleases().forEach((item) => {
    const bucket = ensureBucket(item.brand)
    bucket.releaseDates.push(item.releaseDate)
    bucket.keywords.add(item.gameTitle.toLowerCase())
    bucket.launches.push({
      title: item.gameTitle,
      date: item.releaseDate,
      label: item.evidence,
      type: 'release',
    })
    bucket.evidences.push({
      id: `${item.brand}-release-${item.releaseDate}`,
      label: `${item.gameTitle}: ${item.evidence}`,
      date: item.releaseDate,
      type: 'release',
    })
  })

  scrapeLinkedInJobs().forEach((item) => {
    const bucket = ensureBucket(item.brand)
    bucket.jobDates.push(item.postedDate)
    bucket.evidences.push({
      id: `${item.brand}-job-${item.postedDate}`,
      label: `${item.jobTitle}: ${item.evidence}`,
      date: item.postedDate,
      type: 'job',
    })
  })

  officialYoutubeSignals.forEach((item) => {
    const brandProfile = findBrandProfile(item.brand)

    if (brandProfile?.targetChannel === 'react') {
      return
    }

    const bucket = ensureBucket(item.brand)
    item.keywords.forEach((keyword) => bucket.keywords.add(keyword))
    bucket.officialSignalDates.push(item.publishedAt)
    bucket.launches.push({
      title: item.title,
      date: item.publishedAt,
      label: item.evidence,
      type: 'official',
    })
    bucket.evidences.push({
      id: `${item.brand}-official-yt-${item.publishedAt}-${item.title}`,
      label: item.evidence,
      date: item.publishedAt,
      type: 'release',
    })
    bucket.campaignHistory.push({
      id: `${item.brand}-official-yt-${item.publishedAt}`,
      summary: `${item.title} - ${item.url}`,
      sourceChannel: 'Canal oficial YouTube',
      date: item.publishedAt,
    })
  })

  const leads = [...buckets.values()]
    .map((bucket) => {
      const classification = classifyLead({
        brand: bucket.brand,
        keywords: [...bucket.keywords],
      })

      if (!classification.accepted || !classification.niche || !classification.targetChannel) {
        return null
      }

      if (classification.targetChannel !== 'main') {
        return null
      }

      if (!isGameNiche(classification.niche)) {
        return null
      }

      if (!enabledNiches.has(classification.niche)) {
        return null
      }

      const brandProfile = findBrandProfile(bucket.brand)
      const ticket = estimateTicket(brandProfile?.estimatedTicket ?? 2500)
      const audienceFit = calculateAudienceFit({
        niche: classification.niche,
        targetChannel: 'main',
        mediaKit,
        keywords: [...bucket.keywords, ...(brandProfile?.keywords ?? [])],
      })
      const timing = detectTimingSignal({
        releaseDates: bucket.releaseDates,
        officialSignalDates: bucket.officialSignalDates,
        competitorDates: bucket.sponsorDates,
        jobDates: bucket.jobDates,
        isSeriesLike: false,
      })
      const score = calculateFitScore({
        niche: classification.niche,
        audienceFit: audienceFit.score,
        timingSignal: timing.signal,
        competitorProofCount: bucket.similarChannels.size,
        ticketBand: ticket.ticketBand,
      })
      const lastSignalAt =
        [...bucket.sponsorDates, ...bucket.releaseDates, ...bucket.officialSignalDates, ...bucket.jobDates].sort(
          (left, right) => new Date(right).getTime() - new Date(left).getTime(),
        )[0] ?? today.toISOString()
      const primaryLaunch = pickPrimaryLaunch(bucket.launches, today)
      const launchLabel = primaryLaunch
        ? `${primaryLaunch.title} - ${formatLaunchDate(primaryLaunch.date)}`
        : 'Sem lancamento rastreado'
      const launchEvidence = primaryLaunch?.label ?? 'O melhor sinal do momento veio de publis recentes ou movimento de marketing.'

      const highAudienceFit = audienceFit.score >= 28
      const goodAudienceFit = audienceFit.score >= 22
      const socialProofReady =
        bucket.similarChannels.size >= 2 || bucket.officialSignalDates.length > 0 || Boolean(brandProfile?.isRecurrentOpportunity)
      const priority: Lead['priority'] =
        isImmediateTiming(timing.signal) && highAudienceFit
          ? 'hot'
          : isCurrentTiming(timing.signal) && goodAudienceFit
            ? 'warm'
            : highAudienceFit && socialProofReady
              ? 'warm'
              : 'watch'
      const matchedTopicsText =
        audienceFit.matchedTopics.length > 0
          ? audienceFit.matchedTopics.slice(0, 2).join(', ')
          : mediaKit.audience.main.interests.slice(0, 2).join(', ')
      const isRecurrentOpportunity = Boolean(brandProfile?.isRecurrentOpportunity) || bucket.similarChannels.size >= 3
      const bundleRecommendation = resolveBundleRecommendation({
        lead: {
          brand: bucket.brand,
          niche: classification.niche,
          targetChannel: 'main',
          timingSignal: timing.signal,
          timingLabel: timing.label,
          estimatedTicket: ticket.estimatedTicket,
          isRecurrentOpportunity,
          isGameAdaptation: classification.isGameAdaptation,
        },
        mediaKit,
        matchedTopicsText,
      })
      const launchContext = primaryLaunch ? `${primaryLaunch.title} (${formatLaunchDate(primaryLaunch.date)})` : timing.label
      const recommendedAngle = primaryLaunch
        ? `${bundleRecommendation.pitchAngle} Use ${primaryLaunch.title} como gancho central da proposta.`
        : bundleRecommendation.pitchAngle
      const recommendedNextStep = primaryLaunch
        ? `${bundleRecommendation.nextStep} Deixe explicito que o plano cobre ${primaryLaunch.title} em ${formatLaunchDate(primaryLaunch.date)}.`
        : bundleRecommendation.nextStep
      const whyNow =
        priority === 'hot'
          ? `Lancamento monitorado: ${launchContext}. Melhor abordagem: ${bundleRecommendation.bundleName} com foco em ${matchedTopicsText}.`
          : priority === 'warm'
            ? `Janela atual: ${launchContext}. Vale abrir conversa agora com ${bundleRecommendation.bundleName}.`
            : `Sem janela quente hoje para ${bucket.brand}. O radar segue acompanhando ${launchContext}.`

      const lead: Lead = {
        id: getLeadId(bucket.brand),
        brand: bucket.brand,
        website: brandProfile?.website ?? 'https://example.com',
        marketingContact: brandProfile?.contactEmail ?? 'marketing@example.com',
        niche: classification.niche,
        targetChannel: 'main',
        confidence: classification.confidence,
        reasoning: classification.reasoning,
        ticketBand: ticket.ticketBand,
        estimatedTicket: ticket.estimatedTicket,
        timingSignal: timing.signal,
        timingLabel: timing.label,
        audienceFitLabel: audienceFit.label,
        audienceFitReasoning: audienceFit.reasoning,
        priority,
        whyNow,
        launchTitle: primaryLaunch?.title ?? null,
        launchDate: primaryLaunch?.date ?? null,
        launchLabel,
        launchEvidence,
        recommendedBundleName: bundleRecommendation.bundleName,
        recommendedAngle,
        recommendedNextStep,
        score,
        lastSignalAt,
        evidences: bucket.evidences.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()),
        campaignHistory: bucket.campaignHistory.sort(
          (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
        ),
        similarChannels: [...bucket.similarChannels],
        contacted: false,
        contactedAt: null,
        isRecurrentOpportunity,
        isGameAdaptation: classification.isGameAdaptation,
        reviewRequired: classification.reviewRequired,
      }

      return lead
    })
    .filter(isLead)
    .sort(compareLeads)

  const hotLeads = leads.filter((lead) => lead.priority === 'hot')
  const warmLeads = leads.filter((lead) => lead.priority === 'warm')
  const watchLeads = leads.filter((lead) => lead.priority === 'watch')
  const prioritizedLeadPool = [...hotLeads, ...warmLeads]
  const topLeads = (prioritizedLeadPool.length > 0 ? prioritizedLeadPool : [...hotLeads, ...warmLeads, ...watchLeads]).slice(0, 5)
  const hot = topLeads.filter((lead) => lead.priority === 'hot').length
  const warm = topLeads.filter((lead) => lead.priority === 'warm').length
  const watch = topLeads.filter((lead) => lead.priority === 'watch').length
  const launching = topLeads.filter((lead) => Boolean(lead.launchTitle)).length

  return {
    leads: topLeads,
    summary: {
      total: topLeads.length,
      main: topLeads.length,
      react: 0,
      hot,
      warm,
      watch,
      launching,
      message: `${referenceDate}: ${hot} parceiro(s) games para abordar hoje. ${launching} com lancamento claro no radar.`,
      generatedAt: today.toISOString(),
      referenceDate,
      audienceSnapshot: buildAudienceSnapshot(mediaKit),
    },
  }
}
