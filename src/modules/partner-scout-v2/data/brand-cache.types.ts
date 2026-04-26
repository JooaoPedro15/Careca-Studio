import type { MarcaProspectada } from '../agent/schema.js'

export type BrandStatus =
  | 'descoberta'
  | 'a_contatar'
  | 'contatada'
  | 'em_negociacao'
  | 'convertida'
  | 'sem_retorno'
  | 'rejeitada'
  | 'pular'

export interface BrandHistoryNote {
  ts: string
  text: string
}

export interface BrandCacheEntry {
  nome_normalizado: string
  nome_display: string
  primeira_descoberta: string
  ultima_descoberta: string
  status: BrandStatus
  status_atualizado_em: string
  ultimo_email_usado: string | null
  notas: BrandHistoryNote[]
  ultimo_enriquecimento: MarcaProspectada
}

export const BRAND_STATUS_ATIVO: ReadonlyArray<BrandStatus> = [
  'contatada',
  'em_negociacao',
  'convertida',
  'sem_retorno',
  'rejeitada',
  'pular',
]
