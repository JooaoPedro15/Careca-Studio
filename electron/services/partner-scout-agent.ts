import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { CreatorProfile } from '../../src/modules/partner-scout/data/creator-profile.js'
import { ROBERTO_CARECA_PROFILE } from '../../src/modules/partner-scout/data/creator-profile.js'
import type {
  PartnerAiStatus,
  PartnerBrand,
  PartnerDatabaseFile,
  PartnerDatabasePorte,
  PartnerEnrichmentResult,
  PartnerSearchFilters,
} from '../../src/modules/partner-scout/data/partner-database.types.js'
import type {
  ContatoMarca,
  FitDemografico,
  MarcaProspectada,
  PlanoParceria,
  Porte,
  ProspectionResult,
  TicketEstimadoBRL,
  TipoPubli,
} from '../../src/modules/partner-scout/agent/schema.js'
import type {
  ProspectionRun,
  RunProgressEvent,
  RunUsage,
} from '../../src/modules/partner-scout/agent/run.js'
import { resultToMarkdown } from '../../src/modules/partner-scout/agent/result-to-markdown.js'
import seedDatabase from '../../src/modules/partner-scout/data/partners.json' with { type: 'json' }

export const LOCAL_PARTNER_MODEL = 'local-partners-json'
export const GEMINI_MODEL_FALLBACK_CHAIN = ['gemini-2.5-flash', 'gemini-1.5-flash'] as const

const DEFAULT_MIN_FIT = 4
const DEFAULT_TIMEOUT_MS = 8_000
const DEFAULT_RETRY_DELAY_MS = 3_000
const ENRICHMENT_CACHE_TTL_DAYS = 30
const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 503, 504])
const LOCAL_USAGE: RunUsage = {
  prompt_tokens: 0,
  candidates_tokens: 0,
  cached_content_tokens: 0,
  tool_use_count: 0,
  modelo_efetivo: LOCAL_PARTNER_MODEL,
  custo_estimado_usd: 0,
}

const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  [LOCAL_PARTNER_MODEL]: { input: 0, output: 0 },
}

const CATEGORY_BASE_TICKET: Record<PartnerBrand['categoria'], number> = {
  periferico_gamer: 19_500,
  cadeira_gamer: 13_000,
  pc_setup: 32_000,
  energetico_snack: 19_500,
  loja_jogos: 19_500,
  vpn_software: 13_000,
  mobile_gaming: 13_000,
  aaa_publisher: 19_000,
  streaming_gaming: 19_500,
  cripto_p2e: 4_500,
}

const EVERGREEN_CATEGORIES = new Set<PartnerBrand['categoria']>([
  'periferico_gamer',
  'pc_setup',
  'energetico_snack',
  'loja_jogos',
  'vpn_software',
  'streaming_gaming',
])

export function estimateCostUsd(usage: Pick<RunUsage, 'prompt_tokens' | 'candidates_tokens' | 'tool_use_count' | 'modelo_efetivo'>): number {
  const p = PRICING[usage.modelo_efetivo] ?? PRICING['gemini-2.5-flash']!
  const inputCost = (usage.prompt_tokens / 1_000_000) * p.input
  const outputCost = (usage.candidates_tokens / 1_000_000) * p.output
  return Number((inputCost + outputCost).toFixed(4))
}

export interface RunOptions {
  apiKey?: string
  creator?: CreatorProfile
  filters?: PartnerSearchFilters
  partners?: PartnerBrand[]
  minimumBrands?: number
  timeoutMs?: number
  signal?: AbortSignal
  onProgress?: (event: RunProgressEvent) => void
  fetchImpl?: typeof fetch
  cacheHints?: unknown[]
  evergreenAnterior?: unknown[]
  modelChain?: readonly string[]
  maxToolCalls?: number
}

export interface RunOutcome {
  run: ProspectionRun
  result: ProspectionResult | null
  markdown: string | null
}

export interface PartnerEnrichmentCacheEntry {
  brandId: string
  savedAt: string
  prospect: MarcaProspectada
}

export interface PartnerEnrichmentCache {
  get: (brandId: string) => PartnerEnrichmentCacheEntry | null
  set: (brandId: string, entry: PartnerEnrichmentCacheEntry) => void
}

export interface EnrichPartnerOptions {
  apiKey?: string
  creator?: CreatorProfile
  partners?: PartnerBrand[]
  cache?: PartnerEnrichmentCache
  timeoutMs?: number
  retryDelayMs?: number
  fetchImpl?: typeof fetch
  clock?: () => Date
  onProgress?: (event: RunProgressEvent) => void
  onAiStatus?: (status: PartnerAiStatus) => void
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
  }
  error?: {
    code?: number
    message?: string
    status?: string
  }
}

interface GeminiCallResult {
  status: number
  data: GeminiResponse
  text: string
}

type EnrichmentPatch = Partial<Pick<
  MarcaProspectada,
  'argumento_pitch' | 'plano_parceria' | 'fit_demografico' | 'ticket_estimado_brl' | 'alertas'
>>

function nowIso(clock: () => Date): string {
  return clock().toISOString()
}

function aiStatus(status: PartnerAiStatus['status'], detail: string, clock: () => Date): PartnerAiStatus {
  const label =
    status === 'available' ? 'IA disponivel' :
    status === 'slow' ? 'IA lenta' :
    'IA offline'

  return {
    status,
    label,
    detail,
    updatedAt: nowIso(clock),
  }
}

export function defaultAiStatus(apiKeyConfigured: boolean, clock: () => Date = () => new Date()): PartnerAiStatus {
  if (!apiKeyConfigured) {
    return aiStatus('offline', 'Gemini API key nao configurada. O scout usa a base local.', clock)
  }

  return aiStatus('available', 'Gemini configurado para enriquecimento opcional.', clock)
}

function emitProgress(
  onProgress: ((event: RunProgressEvent) => void) | undefined,
  kind: RunProgressEvent['kind'],
  detail: string,
  clock: () => Date = () => new Date(),
): void {
  onProgress?.({ ts: nowIso(clock), kind, detail })
}

function seedPartnersPathCandidates(): string[] {
  return [
    join(process.cwd(), 'src', 'modules', 'partner-scout', 'data', 'partners.json'),
    join(process.cwd(), 'dist-electron', 'src', 'modules', 'partner-scout', 'data', 'partners.json'),
  ]
}

let seedPartnersCache: PartnerBrand[] | null = null

export function loadSeedPartners(): PartnerBrand[] {
  if (seedPartnersCache) return seedPartnersCache

  const imported = seedDatabase as PartnerDatabaseFile
  if (Array.isArray(imported.brands) && imported.brands.length > 0) {
    seedPartnersCache = imported.brands
    return seedPartnersCache
  }

  for (const path of seedPartnersPathCandidates()) {
    if (!existsSync(path)) continue
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as PartnerDatabaseFile
    seedPartnersCache = parsed.brands
    return seedPartnersCache
  }

  throw new Error('partners.json nao encontrado')
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function uniqueBrands(seed: PartnerBrand[], extra: PartnerBrand[] = []): PartnerBrand[] {
  const map = new Map<string, PartnerBrand>()
  for (const brand of seed) {
    map.set(brand.id, brand)
  }
  for (const brand of extra) {
    map.set(brand.id, brand)
  }
  return [...map.values()]
}

function searchableTextForBrand(brand: PartnerBrand): string {
  return normalizeText([
    brand.nome,
    brand.categoria,
    brand.porte,
    ...brand.sub_categoria,
    ...brand.tags,
  ].join(' '))
}

function partnerMatchesFilters(
  brand: PartnerBrand,
  filters: {
    onlyBr: boolean
    ativaNoBr: boolean
    minFit: number
    categories: Set<PartnerBrand['categoria']>
    portes: Set<PartnerDatabasePorte>
    tags: string[]
    query: string | null
  },
): boolean {
  if (filters.categories.size > 0 && !filters.categories.has(brand.categoria)) return false
  if (filters.portes.size > 0 && !filters.portes.has(brand.porte)) return false
  if (filters.onlyBr && !brand.tem_br) return false
  if (filters.ativaNoBr && !brand.ativa_no_br) return false
  if (brand.fit_canal_games < filters.minFit) return false

  if (filters.tags.length > 0) {
    const haystack = normalizeText([...brand.tags, ...brand.sub_categoria].join(' '))
    const hasAnyTag = filters.tags.some((tag) => haystack.includes(tag))
    if (!hasAnyTag) return false
  }

  return !filters.query || searchableTextForBrand(brand).includes(filters.query)
}

export function normalizePartnerBrand(brand: PartnerBrand): PartnerBrand {
  const id = normalizeText(brand.id || brand.nome)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  if (!id) throw new Error('Partner brand precisa de id ou nome')
  if (!brand.nome?.trim()) throw new Error('Partner brand precisa de nome')
  if (!brand.categoria) throw new Error('Partner brand precisa de categoria')
  if (!brand.site?.trim()) throw new Error('Partner brand precisa de site')
  if (brand.fit_canal_games < 1 || brand.fit_canal_games > 5) {
    throw new Error('fit_canal_games deve ficar entre 1 e 5')
  }

  return {
    ...brand,
    id,
    nome: brand.nome.trim(),
    sub_categoria: brand.sub_categoria ?? [],
    tags: brand.tags ?? [],
    creators_br_referencia: brand.creators_br_referencia ?? [],
    pagina_parceria: brand.pagina_parceria ?? null,
    email_parceria: brand.email_parceria ?? null,
    agencia_representante: brand.agencia_representante ?? null,
  }
}

export function addPartner(brandData: PartnerBrand, existingBrands: PartnerBrand[] = []): PartnerBrand {
  const normalized = normalizePartnerBrand(brandData)
  const duplicate = existingBrands.some((brand) => brand.id === normalized.id)
  if (duplicate) throw new Error(`Partner "${normalized.id}" ja existe na base`)
  return normalized
}

export function searchPartners(filters: PartnerSearchFilters = {}, partners: PartnerBrand[] = loadSeedPartners()): PartnerBrand[] {
  const normalizedFilters = {
    onlyBr: filters.onlyBr ?? true,
    ativaNoBr: filters.ativaNoBr ?? true,
    minFit: filters.minFit ?? DEFAULT_MIN_FIT,
    categories: new Set(filters.categorias ?? []),
    portes: new Set(filters.porte ?? []),
    tags: (filters.tags ?? []).map(normalizeText),
    query: filters.query ? normalizeText(filters.query) : null,
  }

  const result = partners
    .filter((brand) => partnerMatchesFilters(brand, normalizedFilters))
    .sort((a, b) => {
      const fitDiff = b.fit_canal_games - a.fit_canal_games
      if (fitDiff !== 0) return fitDiff
      const dateDiff = b.ultima_verificacao.localeCompare(a.ultima_verificacao)
      if (dateDiff !== 0) return dateDiff
      return a.nome.localeCompare(b.nome)
    })

  return typeof filters.limit === 'number' ? result.slice(0, filters.limit) : result
}

function mapPorte(porte: PartnerDatabasePorte): Porte {
  if (porte === 'global') return 'global'
  if (porte === 'nacional') return 'regional_grande'
  if (porte === 'indie') return 'startup'
  return 'medio'
}

function tipoPubliFor(brand: PartnerBrand): TipoPubli {
  if (brand.categoria === 'loja_jogos' || brand.categoria === 'vpn_software') return 'codigo_desconto'
  if (brand.categoria === 'pc_setup' && brand.fit_canal_games >= 5) return 'embaixador_long_term'
  if (brand.categoria === 'energetico_snack' && brand.fit_canal_games >= 5) return 'embaixador_long_term'
  if (brand.categoria === 'aaa_publisher' || brand.categoria === 'mobile_gaming') return 'short_patrocinado'
  return 'integracao'
}

function roundTo500(value: number): number {
  return Math.max(1_500, Math.round(value / 500) * 500)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function ticketFor(brand: PartnerBrand, creator: CreatorProfile): TicketEstimadoBRL {
  const base = CATEGORY_BASE_TICKET[brand.categoria]
  const fitMultiplier = 0.75 + brand.fit_canal_games * 0.08
  const viewsMultiplier = clamp(creator.views_28d / 7_000_000, 0.85, 1.35)
  const ideal = roundTo500(base * fitMultiplier * viewsMultiplier)

  return {
    minimo: roundTo500(ideal * 0.65),
    ideal,
    premium: roundTo500(ideal * 1.35),
    base_calculo: `Base Media Kit games: shorts 100k-350k views, ${creator.inscritos.toLocaleString('pt-BR')} inscritos, ${creator.views_28d.toLocaleString('pt-BR')} views/28d.`,
  }
}

function fitFor(brand: PartnerBrand, creator: CreatorProfile): FitDemografico {
  const score = brand.fit_canal_games * 2
  const highIntent = creator.publico.intencao_compra_alta.includes('Computers & Peripherals')
  const reason = highIntent
    ? 'Publico com alta afinidade por games, computadores e perifericos; formato shorts-first favorece demonstracao rapida.'
    : 'Publico do canal tem afinidade direta com games e consumo de entretenimento digital.'

  return {
    score,
    justificativa: `Fit local ${brand.fit_canal_games}/5. ${reason}`,
  }
}

function contactFor(brand: PartnerBrand): ContatoMarca {
  return {
    email_primario: brand.email_parceria,
    email_alternativo: null,
    fonte_email: brand.email_parceria ? 'base_local_curada' : 'nao_localizado',
    editavel: true,
    linkedin_decisor: { nome: null, cargo: null, url: null },
    agencia_representante: brand.agencia_representante ?? null,
    formulario_parcerias: brand.pagina_parceria,
  }
}

function planoFor(brand: PartnerBrand): PlanoParceria {
  const bundle =
    brand.categoria === 'aaa_publisher' ? 'Gaming Launch' :
    brand.categoria === 'mobile_gaming' ? 'Mobile Game' :
    brand.categoria === 'energetico_snack' ? 'Energetico ou Snack Gamer' :
    brand.categoria === 'vpn_software' ? 'Codigo + short educativo' :
    brand.categoria === 'loja_jogos' ? 'Plataforma Gaming' :
    'Mensal Games'

  const formats =
    brand.categoria === 'vpn_software' || brand.categoria === 'loja_jogos'
      ? ['2 shorts com CTA', '3 stories com link/cupom', '1 short follow-up']
      : brand.categoria === 'aaa_publisher'
        ? ['3 shorts em sequencia', '1 live gameplay opcional', '2 stories']
        : ['4 shorts ao longo do mes', 'produto em cena', '2 stories']

  return {
    produto_ou_jogo: brand.sub_categoria[0] ?? brand.categoria,
    gancho_lancamento: 'Campanha evergreen validada pela base local; validar timing especifico antes do envio.',
    proposta_ativacao: `${bundle}: campanha shorts-first com linguagem nativa do Roberto Careca e CTA direto para produto, catalogo ou cupom.`,
    formatos_entregaveis: formats,
    periodo_ideal: 'Abordar no inicio do mes comercial ou 3-4 semanas antes de campanha/lancamento.',
    ideia_de_video: `Short de gameplay/setup conectando ${brand.nome} a uma situacao real do canal, com hook nos primeiros 2 segundos.`,
    porque_faz_sentido: `${brand.nome} conversa com o publico gamer BR do canal e com inventario de shorts de alta frequencia.`,
  }
}

function pitchFor(brand: PartnerBrand, creator: CreatorProfile): string {
  return [
    `Oi, time ${brand.nome}.`,
    `Sou do Roberto Careca, canal shorts-first de games com ${creator.inscritos.toLocaleString('pt-BR')} inscritos e forte alcance em publico gamer BR.`,
    `A marca de voces tem fit direto com ${brand.sub_categoria.slice(0, 3).join(', ') || brand.categoria}.`,
    'Minha sugestao e um pacote de shorts nativos com CTA simples, pensado para testar resposta sem depender de video longo.',
  ].join('\n\n')
}

function alertasFor(brand: PartnerBrand): string[] {
  const alerts: string[] = []
  if (!brand.email_parceria && !brand.pagina_parceria) {
    alerts.push('Contato direto nao validado; localizar decisor ou agencia antes do envio.')
  }
  if (!brand.email_parceria && brand.pagina_parceria) {
    alerts.push('Usar formulario de parceria como primeiro caminho; email ainda nao validado.')
  }
  if (brand.categoria === 'cripto_p2e') {
    alerts.push('Validar reputacao, compliance e seguranca antes de qualquer proposta.')
  }
  if (!brand.ja_patrocina_creators_br) {
    alerts.push('Sem prova local recente de creators BR na base; abordar como teste.')
  }
  return alerts
}

export function brandToProspect(brand: PartnerBrand, creator: CreatorProfile = ROBERTO_CARECA_PROFILE): MarcaProspectada {
  return {
    marca: brand.nome,
    categoria: brand.categoria,
    site: brand.site,
    operacao_brasil: brand.tem_br && brand.ativa_no_br ? 'confirmada' : brand.tem_br ? 'provavel' : 'nao',
    ultima_atividade_publica: `Base local verificada em ${brand.ultima_verificacao}`,
    porte: mapPorte(brand.porte),
    campanhas_recentes_creator: [],
    lancamentos_proximos: [],
    fit_demografico: fitFor(brand, creator),
    tipo_publi_recomendado: tipoPubliFor(brand),
    ticket_estimado_brl: ticketFor(brand, creator),
    plano_parceria: planoFor(brand),
    contato: contactFor(brand),
    argumento_pitch: pitchFor(brand, creator),
    alertas: alertasFor(brand),
  }
}

function buildProspectionResult(
  brands: PartnerBrand[],
  creator: CreatorProfile,
  totalCandidates: number,
): ProspectionResult {
  const prospects = brands.map((brand) => brandToProspect(brand, creator))
  const evergreen = brands
    .filter((brand) => EVERGREEN_CATEGORIES.has(brand.categoria))
    .slice(0, 12)
    .map((brand) => brandToProspect(brand, creator))
  const emailFound = prospects.filter((brand) => brand.contato.email_primario).length
  const categories = new Set(prospects.map((brand) => brand.categoria))

  return {
    executado_em: new Date().toISOString(),
    ano_referencia: new Date().getFullYear(),
    janela_temporal_busca: 'base local curada',
    criador: creator.nome,
    queries_executadas: ['base_local:src/modules/partner-scout/data/partners.json'],
    candidatos_descobertos: totalCandidates,
    filtrados: Math.max(0, totalCandidates - prospects.length),
    resultado_final: prospects,
    marcas_atemporais: evergreen,
    top_10_destaque: prospects.slice(0, 10).map((brand) => brand.marca),
    estatisticas_busca: {
      emails_encontrados: emailFound,
      emails_inferidos: 0,
      emails_nao_localizados: prospects.length - emailFound,
      categorias_cobertas: categories.size,
    },
    proximas_acoes_sugeridas: [
      'Enriquecer com IA somente as marcas que voce pretende abordar agora.',
      'Validar contato comercial antes de disparar pitch.',
      'Adicionar novas marcas via addPartner depois de curadoria manual.',
    ],
  }
}

export async function runProspection(options: RunOptions = {}): Promise<RunOutcome> {
  const creator = options.creator ?? ROBERTO_CARECA_PROFILE
  const startedAt = new Date().toISOString()
  const progressLog: RunProgressEvent[] = []
  const clock = () => new Date()
  const emit = (kind: RunProgressEvent['kind'], detail: string) => {
    const event = { ts: nowIso(clock), kind, detail }
    progressLog.push(event)
    options.onProgress?.(event)
  }

  if (options.signal?.aborted) {
    const run = abortedRun(startedAt, progressLog)
    return {
      run,
      result: null,
      markdown: null,
    }
  }

  const seed = uniqueBrands(loadSeedPartners(), options.partners ?? [])
  emit('phase', 'Busca local em partners.json iniciada; nenhuma chamada de IA nesta etapa.')
  const brands = searchPartners(options.filters ?? {}, seed)
  const result = buildProspectionResult(brands, creator, seed.length)
  emit('phase', `Busca local concluida com ${brands.length} marcas; usando dados locais como fonte da verdade.`)

  const run: ProspectionRun = {
    id: randomUUID(),
    startedAt,
    finishedAt: new Date().toISOString(),
    status: 'done',
    error: null,
    usage: localUsage(),
    result,
    progressLog,
  }

  return { run, result, markdown: resultToMarkdown(result) }
}

function makeGeminiUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
}

function buildEnrichmentBody(brand: PartnerBrand, localProspect: MarcaProspectada, creator: CreatorProfile) {
  return {
    systemInstruction: {
      parts: [{
        text: [
          'Voce enriquece uma marca ja existente na base local do Partner Scout.',
          'Nao descubra novas marcas. Nao use web search. Retorne apenas JSON valido.',
          'Contexto do canal: Roberto Careca, games, shorts-first, publico BR, 100k-350k views combinadas por publicacao quando vendido com TikTok.',
          `Metricas locais: ${creator.inscritos} inscritos, ${creator.views_28d} views/28d, retencao ${creator.retencao_media}%.`,
        ].join('\n'),
      }],
    },
    contents: [{
      role: 'user',
      parts: [{
        text: JSON.stringify({
          tarefa: 'Enriqueca esta marca com pitch personalizado, hook, fit e ticket. Preserve dados locais quando nao tiver certeza.',
          brand,
          localProspect,
          formato_resposta: {
            argumento_pitch: 'string',
            plano_parceria: localProspect.plano_parceria,
            fit_demografico: localProspect.fit_demografico,
            ticket_estimado_brl: localProspect.ticket_estimado_brl,
            alertas: localProspect.alertas,
          },
        }),
      }],
    }],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  }
}

async function callGeminiOnce(
  model: string,
  apiKey: string,
  body: unknown,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<GeminiCallResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)
  try {
    const response = await fetchImpl(makeGeminiUrl(model, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    let data: GeminiResponse = {}
    try {
      data = (await response.json()) as GeminiResponse
    } catch {
      data = {}
    }
    const text = data.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text ?? ''
    return { status: response.status, data, text }
  } finally {
    clearTimeout(timeout)
  }
}

function parseJsonPatch(text: string): EnrichmentPatch | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = (fenced?.[1] ?? text).trim()
  try {
    return JSON.parse(candidate) as EnrichmentPatch
  } catch {
    return null
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function mergeEnrichment(local: MarcaProspectada, patch: EnrichmentPatch | null): MarcaProspectada {
  if (!patch) return local

  const next: MarcaProspectada = { ...local }
  if (typeof patch.argumento_pitch === 'string' && patch.argumento_pitch.trim()) {
    next.argumento_pitch = patch.argumento_pitch.trim()
  }
  if (patch.plano_parceria && typeof patch.plano_parceria === 'object') {
    next.plano_parceria = { ...local.plano_parceria!, ...patch.plano_parceria }
  }
  if (patch.fit_demografico && typeof patch.fit_demografico === 'object') {
    next.fit_demografico = {
      score: clamp(Number(patch.fit_demografico.score ?? local.fit_demografico.score), 0, 10),
      justificativa: typeof patch.fit_demografico.justificativa === 'string'
        ? patch.fit_demografico.justificativa
        : local.fit_demografico.justificativa,
    }
  }
  if (patch.ticket_estimado_brl && typeof patch.ticket_estimado_brl === 'object') {
    next.ticket_estimado_brl = {
      minimo: Number(patch.ticket_estimado_brl.minimo ?? local.ticket_estimado_brl.minimo),
      ideal: Number(patch.ticket_estimado_brl.ideal ?? local.ticket_estimado_brl.ideal),
      premium: Number(patch.ticket_estimado_brl.premium ?? local.ticket_estimado_brl.premium),
      base_calculo: typeof patch.ticket_estimado_brl.base_calculo === 'string'
        ? patch.ticket_estimado_brl.base_calculo
        : local.ticket_estimado_brl.base_calculo,
    }
  }
  if (isStringArray(patch.alertas)) {
    next.alertas = [...new Set([...local.alertas, ...patch.alertas])]
  }

  return next
}

function cacheIsFresh(entry: PartnerEnrichmentCacheEntry, clock: () => Date): boolean {
  const savedAt = new Date(entry.savedAt).getTime()
  if (!Number.isFinite(savedAt)) return false
  const ageMs = clock().getTime() - savedAt
  return ageMs >= 0 && ageMs <= ENRICHMENT_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
}

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function localEnrichmentResult(
  brand: PartnerBrand,
  localProspect: MarcaProspectada,
  message: string,
  status: PartnerAiStatus,
): PartnerEnrichmentResult {
  return {
    brandId: brand.id,
    source: 'local',
    message,
    aiStatus: status,
    prospect: localProspect,
  }
}

function localUsage(): RunUsage {
  return { ...LOCAL_USAGE }
}

function abortedRun(startedAt: string, progressLog: RunProgressEvent[]): ProspectionRun {
  return {
    id: randomUUID(),
    startedAt,
    finishedAt: new Date().toISOString(),
    status: 'aborted',
    error: 'aborted',
    usage: localUsage(),
    result: null,
    progressLog,
  }
}

function enrichmentAttempts(retryDelayMs: number): Array<{ model: string; waitBeforeMs: number }> {
  return [
    { model: 'gemini-2.5-flash', waitBeforeMs: 0 },
    { model: 'gemini-2.5-flash', waitBeforeMs: retryDelayMs },
    { model: 'gemini-1.5-flash', waitBeforeMs: 0 },
  ]
}

export async function enrichPartner(brandId: string, options: EnrichPartnerOptions = {}): Promise<PartnerEnrichmentResult> {
  const clock = options.clock ?? (() => new Date())
  const creator = options.creator ?? ROBERTO_CARECA_PROFILE
  const brands = uniqueBrands(loadSeedPartners(), options.partners ?? [])
  const brand = brands.find((item) => item.id === brandId)
  if (!brand) throw new Error(`PARTNER_NOT_FOUND:${brandId}`)

  const localProspect = brandToProspect(brand, creator)
  const cached = options.cache?.get(brand.id)
  if (cached && cacheIsFresh(cached, clock)) {
    const status = aiStatus('available', 'Enriquecimento recuperado do cache local de 30 dias.', clock)
    options.onAiStatus?.(status)
    emitProgress(options.onProgress, 'phase', `enriquecimento de ${brand.nome} recuperado do cache`, clock)
    return {
      brandId: brand.id,
      source: 'cache',
      message: 'Enriquecimento recuperado do cache.',
      aiStatus: status,
      prospect: cached.prospect,
    }
  }

  if (!options.apiKey) {
    const status = aiStatus('offline', 'Gemini API key ausente; usando dados locais (IA offline).', clock)
    options.onAiStatus?.(status)
    emitProgress(options.onProgress, 'fallback', `usando dados locais (IA offline): ${brand.nome}`)
    return localEnrichmentResult(
      brand,
      localProspect,
      'Enriquecimento por IA indisponivel no momento. Mostrando dados da base local.',
      status,
    )
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
  const fetchImpl = options.fetchImpl ?? fetch
  const attempts = enrichmentAttempts(retryDelayMs)
  const body = buildEnrichmentBody(brand, localProspect, creator)
  let lastFailure = 'IA offline'

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index]!
    if (attempt.waitBeforeMs > 0) {
      await delay(attempt.waitBeforeMs)
    }

    try {
      const response = await callGeminiOnce(attempt.model, options.apiKey, body, timeoutMs, fetchImpl)
      if (response.status >= 200 && response.status < 300) {
        const patch = parseJsonPatch(response.text)
        const prospect = mergeEnrichment(localProspect, patch)
        const status = aiStatus('available', `Enriquecimento concluido com ${attempt.model}.`, clock)
        options.cache?.set(brand.id, { brandId: brand.id, savedAt: nowIso(clock), prospect })
        options.onAiStatus?.(status)
        emitProgress(options.onProgress, 'phase', `enriquecimento de ${brand.nome} concluido com ${attempt.model}`, clock)
        return {
          brandId: brand.id,
          source: 'ai',
          message: 'Enriquecimento por IA concluido.',
          aiStatus: status,
          prospect,
        }
      }

      lastFailure = `${attempt.model} HTTP ${response.status}: ${response.data.error?.message ?? 'sem detalhe'}`
      if (RETRYABLE_HTTP_STATUSES.has(response.status) && index < attempts.length - 1) {
        const status = aiStatus('slow', `${attempt.model} retornou ${response.status}; tentando fallback sem quebrar a UI.`, clock)
        options.onAiStatus?.(status)
        emitProgress(options.onProgress, 'fallback', `${attempt.model} retornou ${response.status}; usando fallback de enriquecimento`, clock)
        continue
      }
      break
    } catch (error) {
      lastFailure = (error as Error).message || 'falha desconhecida'
      if (index < attempts.length - 1) {
        const status = aiStatus('slow', `${attempt.model} falhou; tentando fallback sem quebrar a UI.`, clock)
        options.onAiStatus?.(status)
        emitProgress(options.onProgress, 'fallback', `${attempt.model} falhou; usando fallback de enriquecimento`, clock)
        continue
      }
      break
    }
  }

  const status = aiStatus('offline', `usando dados locais (IA offline). Ultima falha: ${lastFailure}`, clock)
  options.onAiStatus?.(status)
  emitProgress(options.onProgress, 'fallback', `usando dados locais (IA offline): ${brand.nome}`)

  return localEnrichmentResult(
    brand,
    localProspect,
    'Enriquecimento por IA indisponivel no momento. Mostrando dados da base local.',
    status,
  )
}
