export type PartnerCategory =
  | 'periferico_gamer'
  | 'cadeira_gamer'
  | 'pc_setup'
  | 'energetico_snack'
  | 'loja_jogos'
  | 'vpn_software'
  | 'mobile_gaming'
  | 'aaa_publisher'
  | 'streaming_gaming'
  | 'cripto_p2e'

export type PartnerDatabasePorte = 'global' | 'nacional' | 'regional' | 'indie'

export interface PartnerBrand {
  id: string
  nome: string
  categoria: PartnerCategory
  sub_categoria: string[]
  porte: PartnerDatabasePorte
  tem_br: boolean
  site: string
  pagina_parceria: string | null
  email_parceria: string | null
  ativa_no_br: boolean
  ja_patrocina_creators_br: boolean
  creators_br_referencia: string[]
  fit_canal_games: 1 | 2 | 3 | 4 | 5
  tags: string[]
  ultima_verificacao: string
  agencia_representante?: string | null
  notas_curadoria?: string
}

export interface PartnerDatabaseFile {
  schema_version: number
  updated_at: string
  foco: 'roberto_careca_games'
  brands: PartnerBrand[]
}

export interface PartnerSearchFilters {
  categorias?: PartnerCategory[]
  porte?: PartnerDatabasePorte[]
  onlyBr?: boolean
  ativaNoBr?: boolean
  minFit?: number
  tags?: string[]
  query?: string
  limit?: number
}

export type PartnerAiStatusValue = 'available' | 'slow' | 'offline'

export interface PartnerAiStatus {
  status: PartnerAiStatusValue
  label: string
  detail: string
  updatedAt: string
}

export interface PartnerEnrichmentResult {
  brandId: string
  source: 'ai' | 'cache' | 'local'
  message: string
  aiStatus: PartnerAiStatus
  prospect: import('../agent/schema.js').MarcaProspectada
}
