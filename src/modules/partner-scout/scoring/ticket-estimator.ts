import { getTicketBand } from '@/modules/partner-scout/data/niche-filters'
import type { TicketBand } from '@/modules/partner-scout/data/niche-filters'

export interface TicketEstimate {
  estimatedTicket: number
  ticketBand: TicketBand
}

export function estimateTicket(value: number): TicketEstimate {
  return {
    estimatedTicket: value,
    ticketBand: getTicketBand(value),
  }
}

