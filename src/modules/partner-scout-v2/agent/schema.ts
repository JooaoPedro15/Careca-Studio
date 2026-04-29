export type OperacaoBrasil = 'confirmada' | 'provavel' | 'nao'
export type Porte = 'global' | 'regional_grande' | 'medio' | 'startup'
export type TipoPubli = 'short_patrocinado' | 'integracao' | 'codigo_desconto' | 'embaixador_long_term'
export type FonteEmail = string

export interface FitDemografico {
  score: number
  justificativa: string
}

export interface TicketEstimadoBRL {
  minimo: number
  ideal: number
  premium: number
  base_calculo: string
}

export interface LinkedInDecisor {
  nome: string | null
  cargo: string | null
  url: string | null
}

export interface ContatoMarca {
  email_primario: string | null
  email_alternativo: string | null
  fonte_email: FonteEmail
  editavel: true
  linkedin_decisor: LinkedInDecisor
  agencia_representante: string | null
  formulario_parcerias: string | null
}

export interface CampanhaRecenteCreator {
  creator: string
  marca_no_post: string
  data: string
  link: string
}

export type TipoLancamento = 'jogo' | 'produto' | 'evento' | 'temporada'

export interface LancamentoProximo {
  titulo: string
  data_prevista: string
  tipo: TipoLancamento
}

export interface PlanoParceria {
  produto_ou_jogo: string
  gancho_lancamento: string
  proposta_ativacao: string
  formatos_entregaveis: string[]
  periodo_ideal: string
  ideia_de_video: string
  porque_faz_sentido: string
}

export interface MarcaProspectada {
  marca: string
  categoria: string
  site: string
  operacao_brasil: OperacaoBrasil
  ultima_atividade_publica: string
  porte: Porte
  campanhas_recentes_creator: CampanhaRecenteCreator[]
  lancamentos_proximos: LancamentoProximo[]
  fit_demografico: FitDemografico
  tipo_publi_recomendado: TipoPubli
  ticket_estimado_brl: TicketEstimadoBRL
  plano_parceria?: PlanoParceria
  contato: ContatoMarca
  argumento_pitch: string
  alertas: string[]
}

export interface EstatisticasBusca {
  emails_encontrados: number
  emails_inferidos: number
  emails_nao_localizados: number
  categorias_cobertas: number
}

export interface ProspectionResult {
  executado_em: string
  ano_referencia: number
  janela_temporal_busca: string
  criador: string
  queries_executadas: string[]
  candidatos_descobertos: number
  filtrados: number
  resultado_final: MarcaProspectada[]
  marcas_atemporais: MarcaProspectada[]
  top_10_destaque: string[]
  estatisticas_busca: EstatisticasBusca
  proximas_acoes_sugeridas: string[]
}
