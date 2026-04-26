import type { MediaKitData } from '@/modules/media-kit/data/mediakit.schema'
import { loadMediaKitData } from '@/modules/media-kit/services/storage.service'
import type { GeneratedPitch, Lead } from '@/modules/partner-scout/data/leads.store'
import { nicheLabels } from '@/modules/partner-scout/data/niche-filters'
import { resolveBundleRecommendation } from '@/modules/partner-scout/services/bundle-recommendation.service'

function getHeroMetric(mediaKit: MediaKitData): string {
  return mediaKit.combinedShortsReach.main.label
}

function getAudienceLine(mediaKit: MediaKitData): string {
  const youthShare = mediaKit.audience.main.ageRanges
    .filter((item) => item.range === '13-17' || item.range === '18-24')
    .reduce((total, item) => total + item.percent, 0)
  const interests = mediaKit.audience.main.interests.slice(0, 3).join(', ')

  return `${getHeroMetric(mediaKit)}, com ${youthShare}% da audiencia entre 13-24 e interesses em ${interests}.`
}

function formatLaunchDate(date: string | null): string {
  if (!date) {
    return 'sem data fechada'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(date))
}

function buildLaunchLine(lead: Lead): string {
  if (!lead.launchTitle) {
    return `o timing atual de ${lead.timingLabel.toLowerCase()}`
  }

  return `${lead.launchTitle} com janela monitorada para ${formatLaunchDate(lead.launchDate)}`
}

function buildSubject(lead: Lead): string {
  return `${lead.brand} x Careca Studio | shorts para ${lead.launchTitle ?? 'janela atual de campanha'}`
}

export function generatePitchForLead(lead: Lead): GeneratedPitch {
  const mediaKit = loadMediaKitData()
  const recommendation = resolveBundleRecommendation({
    lead,
    mediaKit,
    matchedTopicsText: lead.launchTitle ?? lead.launchLabel,
  })
  const bundle = mediaKit.pricing.bundles.find((item) => item.id === recommendation.bundleId) ?? mediaKit.pricing.bundles[0]
  const caseStudy = mediaKit.cases.find((item) => item.channel === 'main') ?? {
    brand: 'case recente',
    results: 'Resultados recentes sob consulta no media kit ativo.',
  }
  const subject = buildSubject(lead)
  const launchLine = buildLaunchLine(lead)
  const audienceLine = getAudienceLine(mediaKit)
  const attachmentLabel = `careca-${recommendation.template}.pdf`

  const proactive = [
    `Oi, time da ${lead.brand}.`,
    `Vi que voces estao em janela de campanha para ${launchLine}.`,
    `No meu canal de games, esse assunto conversa com um publico que responde muito bem a shorts. Hoje eu entrego ${audienceLine}`,
    `Minha sugestao objetiva e entrar com o bundle "${bundle?.name ?? 'Starter'}", porque ele encaixa bem em ${nicheLabels[lead.niche].toLowerCase()} e permite capturar essa janela com velocidade.`,
    `Gancho da proposta: ${lead.recommendedAngle}`,
    `Como prova de formato, ja rodei campanha na linha de ${caseStudy.brand}: ${caseStudy.results}`,
    `Se fizer sentido, eu envio o media kit games e ja volto com 2 ou 3 ideias de shorts pensadas para ${lead.launchTitle ?? 'essa janela'}.`,
  ].join('\n\n')

  const reactive = [
    `Perfeito. Para ${lead.brand}, eu recomendo comecar pelo bundle "${bundle?.name ?? 'Starter'}".`,
    `O ponto central da proposta seria ${launchLine}, com criativos curtos pensados para awareness rapido e narrativa nativa de creator.`,
    `Meu publico tem aderencia forte com ${nicheLabels[lead.niche].toLowerCase()} e hoje a melhor entrega do meu inventario esta em shorts games.`,
    `Proximo passo: ${lead.recommendedNextStep}`,
    `Se quiser, eu ja monto um rascunho de calendario e assunto de email em cima de ${lead.launchTitle ?? 'essa campanha atual'}.`,
  ].join('\n\n')

  return {
    leadId: lead.id,
    bundleId: bundle?.id ?? recommendation.bundleId,
    bundleName: bundle?.name ?? 'Starter',
    template: recommendation.template,
    subject,
    proactive,
    reactive,
    attachmentLabel,
  }
}
