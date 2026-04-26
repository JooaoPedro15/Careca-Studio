import { addDays, getPartnerScoutToday, toIsoDate } from '@/modules/partner-scout/utils/date'

export interface LinkedInJobSignal {
  brand: string
  jobTitle: string
  postedDate: string
  evidence: string
}

export function scrapeLinkedInJobs(): LinkedInJobSignal[] {
  const today = getPartnerScoutToday()

  return [
    {
      brand: 'Netflix',
      jobTitle: 'Influencer Marketing Manager',
      postedDate: toIsoDate(addDays(today, -6)),
      evidence: 'Vaga aberta ha menos de 14 dias para creator marketing.',
    },
    {
      brand: 'Ubisoft',
      jobTitle: 'Creator Partnerships Specialist',
      postedDate: toIsoDate(addDays(today, -11)),
      evidence: 'Time de creator economy em expansao antes de lancamento.',
    },
    {
      brand: 'EA',
      jobTitle: 'Creator Campaign Manager',
      postedDate: toIsoDate(addDays(today, -5)),
      evidence: 'Vaga recente reforca time de creators para janela de campanha.',
    },
    {
      brand: 'Apple TV+',
      jobTitle: 'Social Marketing Lead',
      postedDate: toIsoDate(addDays(today, -8)),
      evidence: 'Time de social e creators em movimento para estreias proximas.',
    },
    {
      brand: 'Riot Games',
      jobTitle: 'Influencer Partnerships Manager',
      postedDate: toIsoDate(addDays(today, -9)),
      evidence: 'Area de partnerships com contratacao recente para campanhas sazonais.',
    },
  ]
}
