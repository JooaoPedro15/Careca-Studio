# Partner Scout v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o módulo Partner Scout v1 (scrapers + scoring) por um agente LLM Gemini que descobre marcas via `google_search` e `url_context`, enriquece com fit demográfico e caminho de contato, e devolve ≥25 marcas em JSON estruturado.

**Architecture:** Electron main process orquestra chamadas REST ao Gemini API (sem SDK) com tools nativos de busca, faz loop agêntico de tool calling em streaming, persiste histórico de runs e cache de marcas em `electron-store`. Renderer consome via IPC com 4 componentes UI redesenhados. Migração feita em pasta paralela `partner-scout-v2/` + swap atômico no final.

**Tech Stack:** TypeScript ESM + Electron 41 + React 19 + Zustand + Tailwind 4 + electron-store + vitest (novo, só pra testes unitários) + Gemini REST API (`gemini-2.5-flash` com fallback chain).

**Spec:** [docs/superpowers/specs/2026-04-25-partner-scout-v2-llm-agent-design.md](../specs/2026-04-25-partner-scout-v2-llm-agent-design.md)

---

## Pré-requisitos do executor

1. **Working directory:** `d:\Projetos\careca-studio`
2. **Shell:** bash (paths com forward slashes)
3. **Node ≥ 18** (pra `fetch` nativo)
4. **Chave Gemini configurada** em uma das 3 fontes (env, `D:\Projetos\Clip-Splitter\.env`, ou registro Windows `HKCU\Environment\GEMINI_API_KEY`)
5. **Git NÃO inicializado no projeto** — vamos inicializar como Task 0

## File Structure

### Arquivos criados (em `src/modules/partner-scout-v2/` durante parallel build)

| Path | Responsabilidade |
|---|---|
| `agent/system-prompt.ts` | Builder do system prompt com variáveis temporais resolvidas, contexto do criador e bloco de cache |
| `agent/schema.ts` | Types TS do output (`MarcaProspectada`, `ProspectionResult`, etc.) |
| `agent/gemini-schema.ts` | Conversão dos types pro formato OpenAPI exigido pelo `responseSchema` do Gemini |
| `agent/run.ts` | Types de execução (`ProspectionRun`, `RunUsage`, `RunProgressEvent`, `RunStatus`) |
| `data/creator-profile.ts` | Constante `ROBERTO_CARECA_PROFILE` com snapshot atual do canal |
| `data/brand-cache.types.ts` | Types de cache (`BrandStatus`, `BrandCacheEntry`, `BrandHistoryNote`) |
| `data/prospection-run.store.ts` | Zustand store de UI state (sem persist) |
| `utils/normalize-brand-name.ts` | Função de normalização de nomes pra chave do cache |
| `components/ScoutDashboard.tsx` | Tela principal: header, tabs (Top 10 / Histórico / Cache), grid agrupado, log do agente |
| `components/LeadCard.tsx` | Card compacto de marca |
| `components/LeadDetail.tsx` | Painel lateral 480px com todos os campos editáveis |
| `components/SourcesConfig.tsx` | 5 seções: Gemini API status, perfil criador, limites, cache, telemetria |
| `index.tsx` | Entrypoint do módulo (substitui o atual) |

### Arquivos criados em `electron/services/` (não vão pra pasta paralela — só existe um main)

| Path | Responsabilidade |
|---|---|
| `electron/services/gemini-key-resolver.ts` | Resolve chave Gemini em 3 fontes, espelha lógica do ClipSplitter |
| `electron/services/brand-cache.ts` | Wrapper de electron-store pra `partner-scout-cache.json` |
| `electron/services/run-history.ts` | Wrapper de electron-store pra `partner-scout-runs.json` |
| `electron/services/partner-scout-agent.ts` | Orquestrador: monta payload, chama Gemini REST, loop tool_use, fallback de modelo, parse JSON |

### Arquivos modificados

| Path | Mudança |
|---|---|
| `package.json` | Add `electron-store`, `uuid`, `@types/uuid`, `vitest` |
| `electron/preload.ts` | Add interface `partnerScout` no contextBridge (substitui a antiga `fetchOfficialYoutubeSignals`) |
| `electron/ipc/partnerScout.ts` | Rewrite completo com novos handlers |
| `README.md` | Reescrever seção "Partner Scout" |
| `C:\Users\João\.claude\skills\careca-studio\SKILL.md` | Atualizar descrição do módulo |

### Arquivos deletados (no swap final)

- `src/modules/partner-scout/` inteiro (substituído pelo conteúdo de `partner-scout-v2/`)
- `02-partner-scout.md` na raiz (movido pra `docs/legacy/02-partner-scout-v1.md`)

---

## Task 0: Prerequisites — git init + vitest setup

**Files:**
- Create: `.gitignore` (se não existir)
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Verificar estado git e criar `.gitignore` se faltar**

```bash
cat .gitignore 2>/dev/null | head
```

Se já existe, pular. Se não, criar:

```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
dist-electron/
__pycache__/
tmp-test/
*.log
.env
.env.local
.DS_Store
EOF
```

- [ ] **Step 2: Inicializar git**

```bash
git init
git add -A
git commit -m "chore: initial snapshot before Partner Scout v2 migration"
```

Expected: branch `master` ou `main` criado, primeiro commit registrado.

- [ ] **Step 3: Instalar vitest**

```bash
npm install --save-dev vitest @vitest/ui
```

- [ ] **Step 4: Criar `vitest.config.ts` na raiz**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'electron/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
```

- [ ] **Step 5: Adicionar script de teste no `package.json`**

Editar `scripts` em `package.json` adicionando:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Smoke test do vitest**

Criar arquivo temporário `tmp-test/smoke.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'

describe('vitest smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

Rodar:

```bash
npx vitest run tmp-test/smoke.test.ts
```

Expected: 1 passed.

Deletar o arquivo de smoke:

```bash
rm tmp-test/smoke.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json package-lock.json vitest.config.ts
git commit -m "chore: setup vitest for unit tests"
```

---

## Task 1: Install runtime deps

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar electron-store, uuid, @types/uuid**

```bash
npm install electron-store@^10
npm install --save-dev uuid @types/uuid
```

(Nota: `uuid` vai como dev porque vai ser usado só em código `electron/` que é compilado pra `dist-electron/`; se tudo der certo runtime, mover pra deps).

Aguarda — vai pra `dependencies` mesmo, porque é importado em runtime do main:

```bash
npm uninstall uuid @types/uuid
npm install uuid
npm install --save-dev @types/uuid
```

- [ ] **Step 2: Verificar que build ainda passa**

```bash
npm run build
```

Expected: build completa sem erros.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install electron-store and uuid for Partner Scout v2"
```

---

## Task 2: Schema + types

**Files:**
- Create: `src/modules/partner-scout-v2/agent/schema.ts`
- Create: `src/modules/partner-scout-v2/agent/run.ts`
- Create: `src/modules/partner-scout-v2/agent/gemini-schema.ts`
- Create: `src/modules/partner-scout-v2/data/brand-cache.types.ts`
- Create: `src/modules/partner-scout-v2/data/creator-profile.ts`
- Create: `src/modules/partner-scout-v2/agent/gemini-schema.test.ts`

- [ ] **Step 1: Criar `schema.ts`**

Caminho: `src/modules/partner-scout-v2/agent/schema.ts`

```typescript
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
  top_10_destaque: string[]
  estatisticas_busca: EstatisticasBusca
  proximas_acoes_sugeridas: string[]
}
```

- [ ] **Step 2: Criar `run.ts`**

Caminho: `src/modules/partner-scout-v2/agent/run.ts`

```typescript
import type { ProspectionResult } from './schema.js'

export type RunStatus = 'pending' | 'running' | 'done' | 'error' | 'aborted'

export interface RunUsage {
  prompt_tokens: number
  candidates_tokens: number
  cached_content_tokens: number
  tool_use_count: number
  modelo_efetivo: string
  custo_estimado_usd: number
}

export interface RunProgressEvent {
  ts: string
  kind: 'tool_use' | 'tool_result' | 'text_delta' | 'error' | 'phase' | 'fallback'
  detail: string
}

export interface ProspectionRun {
  id: string
  startedAt: string
  finishedAt: string | null
  status: RunStatus
  error: string | null
  usage: RunUsage
  result: ProspectionResult | null
  progressLog: RunProgressEvent[]
}
```

- [ ] **Step 3: Criar `brand-cache.types.ts`**

Caminho: `src/modules/partner-scout-v2/data/brand-cache.types.ts`

```typescript
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
```

- [ ] **Step 4: Criar `creator-profile.ts`**

Caminho: `src/modules/partner-scout-v2/data/creator-profile.ts`

```typescript
export interface CreatorProfile {
  nome: string
  canal: string
  inscritos: number
  views_28d: number
  espectadores_unicos_28d: number
  tempo_exibicao_horas_28d: number
  retencao_media: number
  recorrentes: number
  formato_principal: string
  views_por_short: string
  mei: boolean
  emite_nf: boolean
  canais_localizados: string[]
  publico: {
    genero: { masculino: number; feminino: number }
    idade: Record<string, number>
    geografia: Record<string, number>
    renda_familiar: Record<string, number>
    status_parental: { nao_pais: number; pais: number }
    interesses_alto: string[]
    intencao_compra_alta: string[]
  }
}

export const ROBERTO_CARECA_PROFILE: CreatorProfile = {
  nome: 'Roberto Careca',
  canal: 'youtube.com/@robertocareca',
  inscritos: 405000,
  views_28d: 7000000,
  espectadores_unicos_28d: 1900000,
  tempo_exibicao_horas_28d: 33300,
  retencao_media: 88.2,
  recorrentes: 76.1,
  formato_principal: 'shorts',
  views_por_short: '50000-200000',
  mei: true,
  emite_nf: true,
  canais_localizados: ['es', 'en', 'de'],
  publico: {
    genero: { masculino: 61.4, feminino: 38.0 },
    idade: {
      '13-17': 33.3,
      '18-24': 9.5,
      '25-34': 18.9,
      '35-44': 22.0,
      '45-54': 11.2,
      '55-64': 3.0,
      '65+': 2.2,
    },
    geografia: {
      brasil: 96.4,
      portugal: 2.4,
    },
    renda_familiar: {
      top_10: 28.9,
      top_11_20: 30.2,
      top_21_30: 18.3,
      top_31_40: 11.1,
      lower_50: 7.7,
    },
    status_parental: { nao_pais: 62.9, pais: 37.6 },
    interesses_alto: [
      'Hardcore Gamers',
      'Adventure & Strategy Game Fans',
      'Casual & Social Gamers',
      'Shooter Game Fans',
      'Fans of New & Upcoming Video Games',
    ],
    intencao_compra_alta: [
      'Photo Printing Services',
      'Photo & Video Services',
      'Computers',
      'Computers & Peripherals',
      'Pro Musician & DJ Equipment',
    ],
  },
}
```

- [ ] **Step 5: Criar `gemini-schema.ts`**

Caminho: `src/modules/partner-scout-v2/agent/gemini-schema.ts`

```typescript
// Schema OpenAPI usado no responseSchema do Gemini.
// Gemini exige tipos em maiúsculas e estrutura ligeiramente diferente do JSON Schema.

export const GEMINI_PROSPECTION_SCHEMA = {
  type: 'OBJECT',
  required: [
    'executado_em',
    'ano_referencia',
    'janela_temporal_busca',
    'criador',
    'queries_executadas',
    'candidatos_descobertos',
    'filtrados',
    'resultado_final',
    'top_10_destaque',
    'estatisticas_busca',
    'proximas_acoes_sugeridas',
  ],
  properties: {
    executado_em: { type: 'STRING' },
    ano_referencia: { type: 'INTEGER' },
    janela_temporal_busca: { type: 'STRING' },
    criador: { type: 'STRING' },
    queries_executadas: { type: 'ARRAY', items: { type: 'STRING' } },
    candidatos_descobertos: { type: 'INTEGER' },
    filtrados: { type: 'INTEGER' },
    top_10_destaque: { type: 'ARRAY', items: { type: 'STRING' } },
    estatisticas_busca: {
      type: 'OBJECT',
      required: [
        'emails_encontrados',
        'emails_inferidos',
        'emails_nao_localizados',
        'categorias_cobertas',
      ],
      properties: {
        emails_encontrados: { type: 'INTEGER' },
        emails_inferidos: { type: 'INTEGER' },
        emails_nao_localizados: { type: 'INTEGER' },
        categorias_cobertas: { type: 'INTEGER' },
      },
    },
    proximas_acoes_sugeridas: { type: 'ARRAY', items: { type: 'STRING' } },
    resultado_final: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: [
          'marca',
          'categoria',
          'site',
          'operacao_brasil',
          'ultima_atividade_publica',
          'porte',
          'campanhas_recentes_creator',
          'lancamentos_proximos',
          'fit_demografico',
          'tipo_publi_recomendado',
          'ticket_estimado_brl',
          'contato',
          'argumento_pitch',
          'alertas',
        ],
        properties: {
          marca: { type: 'STRING' },
          categoria: { type: 'STRING' },
          site: { type: 'STRING' },
          operacao_brasil: {
            type: 'STRING',
            enum: ['confirmada', 'provavel', 'nao'],
          },
          ultima_atividade_publica: { type: 'STRING' },
          porte: {
            type: 'STRING',
            enum: ['global', 'regional_grande', 'medio', 'startup'],
          },
          campanhas_recentes_creator: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              required: ['creator', 'marca_no_post', 'data', 'link'],
              properties: {
                creator: { type: 'STRING' },
                marca_no_post: { type: 'STRING' },
                data: { type: 'STRING' },
                link: { type: 'STRING' },
              },
            },
          },
          lancamentos_proximos: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              required: ['titulo', 'data_prevista', 'tipo'],
              properties: {
                titulo: { type: 'STRING' },
                data_prevista: { type: 'STRING' },
                tipo: {
                  type: 'STRING',
                  enum: ['jogo', 'produto', 'evento', 'temporada'],
                },
              },
            },
          },
          fit_demografico: {
            type: 'OBJECT',
            required: ['score', 'justificativa'],
            properties: {
              score: { type: 'INTEGER' },
              justificativa: { type: 'STRING' },
            },
          },
          tipo_publi_recomendado: {
            type: 'STRING',
            enum: ['short_patrocinado', 'integracao', 'codigo_desconto', 'embaixador_long_term'],
          },
          ticket_estimado_brl: {
            type: 'OBJECT',
            required: ['minimo', 'ideal', 'premium', 'base_calculo'],
            properties: {
              minimo: { type: 'NUMBER' },
              ideal: { type: 'NUMBER' },
              premium: { type: 'NUMBER' },
              base_calculo: { type: 'STRING' },
            },
          },
          contato: {
            type: 'OBJECT',
            required: [
              'email_primario',
              'email_alternativo',
              'fonte_email',
              'editavel',
              'linkedin_decisor',
              'agencia_representante',
              'formulario_parcerias',
            ],
            properties: {
              email_primario: { type: 'STRING', nullable: true },
              email_alternativo: { type: 'STRING', nullable: true },
              fonte_email: { type: 'STRING' },
              editavel: { type: 'BOOLEAN' },
              linkedin_decisor: {
                type: 'OBJECT',
                required: ['nome', 'cargo', 'url'],
                properties: {
                  nome: { type: 'STRING', nullable: true },
                  cargo: { type: 'STRING', nullable: true },
                  url: { type: 'STRING', nullable: true },
                },
              },
              agencia_representante: { type: 'STRING', nullable: true },
              formulario_parcerias: { type: 'STRING', nullable: true },
            },
          },
          argumento_pitch: { type: 'STRING' },
          alertas: { type: 'ARRAY', items: { type: 'STRING' } },
        },
      },
    },
  },
} as const
```

- [ ] **Step 6: Escrever teste do gemini-schema (TDD light — checa estrutura)**

Caminho: `src/modules/partner-scout-v2/agent/gemini-schema.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { GEMINI_PROSPECTION_SCHEMA } from './gemini-schema.js'

describe('GEMINI_PROSPECTION_SCHEMA', () => {
  it('é um OBJECT com todos os campos top-level required', () => {
    expect(GEMINI_PROSPECTION_SCHEMA.type).toBe('OBJECT')
    expect(GEMINI_PROSPECTION_SCHEMA.required).toContain('resultado_final')
    expect(GEMINI_PROSPECTION_SCHEMA.required).toContain('executado_em')
  })

  it('cada item de resultado_final tem todos os 14 campos do MarcaProspectada', () => {
    const itemSchema = GEMINI_PROSPECTION_SCHEMA.properties.resultado_final.items
    expect(itemSchema.required).toEqual(
      expect.arrayContaining([
        'marca',
        'categoria',
        'site',
        'operacao_brasil',
        'ultima_atividade_publica',
        'porte',
        'campanhas_recentes_creator',
        'lancamentos_proximos',
        'fit_demografico',
        'tipo_publi_recomendado',
        'ticket_estimado_brl',
        'contato',
        'argumento_pitch',
        'alertas',
      ]),
    )
  })

  it('lancamentos_proximos é ARRAY de OBJECT com titulo/data_prevista/tipo', () => {
    const lp = GEMINI_PROSPECTION_SCHEMA.properties.resultado_final.items.properties.lancamentos_proximos
    expect(lp.type).toBe('ARRAY')
    expect(lp.items.required).toEqual(['titulo', 'data_prevista', 'tipo'])
    expect(lp.items.properties.tipo.enum).toEqual(['jogo', 'produto', 'evento', 'temporada'])
  })

  it('contato.editavel é BOOLEAN required', () => {
    const contato = GEMINI_PROSPECTION_SCHEMA.properties.resultado_final.items.properties.contato
    expect(contato.required).toContain('editavel')
    expect(contato.properties.editavel.type).toBe('BOOLEAN')
  })
})
```

- [ ] **Step 7: Rodar testes**

```bash
npx vitest run src/modules/partner-scout-v2/agent/gemini-schema.test.ts
```

Expected: 3 passed.

- [ ] **Step 8: Verificar tsc**

```bash
npx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 9: Commit**

```bash
git add src/modules/partner-scout-v2/agent src/modules/partner-scout-v2/data
git commit -m "feat(partner-scout-v2): schema TS, gemini schema, types de cache e creator profile"
```

---

## Task 3: Gemini key resolver

**Files:**
- Create: `electron/services/gemini-key-resolver.ts`
- Create: `electron/services/gemini-key-resolver.test.ts`

Replica `_carregar_gemini_api_key()` do `D:\Projetos\Clip-Splitter\clip_splitter.py:80-100`.

- [ ] **Step 1: Escrever os testes primeiro (TDD)**

Caminho: `electron/services/gemini-key-resolver.test.ts`

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  normalizeApiKey,
  parseDotEnvForGeminiKey,
  resolveGeminiApiKey,
} from './gemini-key-resolver.js'

describe('normalizeApiKey', () => {
  it('retorna string vazia pra placeholders comuns', () => {
    expect(normalizeApiKey('COLE_SUA_CHAVE_AQUI')).toBe('')
    expect(normalizeApiKey('YOUR_GEMINI_API_KEY')).toBe('')
    expect(normalizeApiKey('CHANGE_ME')).toBe('')
    expect(normalizeApiKey('"INSIRA_SUA_CHAVE_AQUI"')).toBe('')
  })

  it('retorna string vazia pra qualquer valor contendo CHAVE_AQUI', () => {
    expect(normalizeApiKey('MINHA_CHAVE_AQUI')).toBe('')
  })

  it('remove aspas e espaços e retorna a chave', () => {
    expect(normalizeApiKey(' "AIzaSyABC123" ')).toBe('AIzaSyABC123')
    expect(normalizeApiKey("'AIzaSyXYZ'")).toBe('AIzaSyXYZ')
  })

  it('retorna string vazia pra entradas vazias/null', () => {
    expect(normalizeApiKey('')).toBe('')
    expect(normalizeApiKey('   ')).toBe('')
  })
})

describe('parseDotEnvForGeminiKey', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), 'gem-key-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('retorna chave válida do .env', () => {
    const envPath = path.join(tmpDir, '.env')
    writeFileSync(envPath, 'OUTRA_VAR=foo\nGEMINI_API_KEY=AIzaReal123\n')
    expect(parseDotEnvForGeminiKey(envPath)).toBe('AIzaReal123')
  })

  it('ignora linhas comentadas', () => {
    const envPath = path.join(tmpDir, '.env')
    writeFileSync(envPath, '# GEMINI_API_KEY=ignorada\nGEMINI_API_KEY=AIzaUsada\n')
    expect(parseDotEnvForGeminiKey(envPath)).toBe('AIzaUsada')
  })

  it('retorna string vazia se chave for placeholder', () => {
    const envPath = path.join(tmpDir, '.env')
    writeFileSync(envPath, 'GEMINI_API_KEY=COLE_SUA_CHAVE_AQUI\n')
    expect(parseDotEnvForGeminiKey(envPath)).toBe('')
  })

  it('retorna string vazia se arquivo não existe', () => {
    expect(parseDotEnvForGeminiKey(path.join(tmpDir, 'inexistente.env'))).toBe('')
  })
})

describe('resolveGeminiApiKey', () => {
  const originalEnv = process.env.GEMINI_API_KEY

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.GEMINI_API_KEY
    } else {
      process.env.GEMINI_API_KEY = originalEnv
    }
    vi.restoreAllMocks()
  })

  it('prioriza process.env quando existe e é válida', () => {
    process.env.GEMINI_API_KEY = 'AIzaFromEnv'
    const result = resolveGeminiApiKey({
      dotEnvPath: '/inexistente.env',
      readWindowsRegistryKey: () => 'AIzaFromRegistry',
    })
    expect(result.key).toBe('AIzaFromEnv')
    expect(result.source).toBe('env')
  })

  it('cai pro .env se env vazia', () => {
    delete process.env.GEMINI_API_KEY
    const tmp = mkdtempSync(path.join(tmpdir(), 'gem-key-'))
    const envPath = path.join(tmp, '.env')
    writeFileSync(envPath, 'GEMINI_API_KEY=AIzaFromDotEnv\n')

    const result = resolveGeminiApiKey({
      dotEnvPath: envPath,
      readWindowsRegistryKey: () => 'AIzaFromRegistry',
    })
    expect(result.key).toBe('AIzaFromDotEnv')
    expect(result.source).toBe('clip-splitter-dotenv')

    rmSync(tmp, { recursive: true, force: true })
  })

  it('cai pro registro Windows se env e .env vazios', () => {
    delete process.env.GEMINI_API_KEY
    const result = resolveGeminiApiKey({
      dotEnvPath: '/inexistente.env',
      readWindowsRegistryKey: () => 'AIzaFromRegistry',
    })
    expect(result.key).toBe('AIzaFromRegistry')
    expect(result.source).toBe('windows-registry')
  })

  it('retorna nenhuma se as 3 fontes falham', () => {
    delete process.env.GEMINI_API_KEY
    const result = resolveGeminiApiKey({
      dotEnvPath: '/inexistente.env',
      readWindowsRegistryKey: () => '',
    })
    expect(result.key).toBe('')
    expect(result.source).toBe('nenhuma')
  })

  it('mascara chave em maskApiKey', () => {
    const result = resolveGeminiApiKey({
      env: 'AIzaSyABCDEFGHIJKLMNOPQRSTU',
      dotEnvPath: '/inexistente.env',
      readWindowsRegistryKey: () => '',
    })
    expect(result.masked).toBe('AIzaSy...QRSTU')
  })
})
```

- [ ] **Step 2: Rodar testes pra ver eles falharem**

```bash
npx vitest run electron/services/gemini-key-resolver.test.ts
```

Expected: FAIL — `Cannot find module './gemini-key-resolver.js'`.

- [ ] **Step 3: Implementar `gemini-key-resolver.ts`**

Caminho: `electron/services/gemini-key-resolver.ts`

```typescript
import { existsSync, readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

export type ApiKeySource = 'env' | 'clip-splitter-dotenv' | 'windows-registry' | 'nenhuma'

export interface ApiKeyResolution {
  key: string
  source: ApiKeySource
  masked: string
}

const PLACEHOLDERS = new Set([
  'COLE_SUA_CHAVE_AQUI',
  'SUA_CHAVE_AQUI',
  'YOUR_API_KEY',
  'YOUR_GEMINI_API_KEY',
  'INSIRA_SUA_CHAVE_AQUI',
  'CHANGE_ME',
])

export function normalizeApiKey(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, '').trim()
  if (!trimmed) return ''
  const upper = trimmed.toUpperCase()
  if (PLACEHOLDERS.has(upper) || upper.includes('CHAVE_AQUI')) return ''
  return trimmed
}

export function parseDotEnvForGeminiKey(filePath: string): string {
  if (!existsSync(filePath)) return ''

  try {
    const content = readFileSync(filePath, 'utf8')
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#') || !line.includes('=')) continue
      const [key, ...valueParts] = line.split('=')
      if (key.trim() === 'GEMINI_API_KEY') {
        return normalizeApiKey(valueParts.join('='))
      }
    }
  } catch {
    return ''
  }

  return ''
}

export function readWindowsRegistryGeminiKey(): string {
  if (process.platform !== 'win32') return ''

  try {
    const output = execSync(
      'reg query "HKCU\\Environment" /v GEMINI_API_KEY',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    const match = output.match(/GEMINI_API_KEY\s+REG_(?:EXPAND_)?SZ\s+(.+)/)
    return normalizeApiKey(match?.[1]?.trim() ?? '')
  } catch {
    return ''
  }
}

export function maskApiKey(key: string): string {
  if (key.length <= 10) return '***'
  return `${key.slice(0, 6)}...${key.slice(-5)}`
}

export const DEFAULT_CLIP_SPLITTER_DOTENV = 'D:\\Projetos\\Clip-Splitter\\.env'

export interface ResolveOptions {
  env?: string
  dotEnvPath?: string
  readWindowsRegistryKey?: () => string
}

export function resolveGeminiApiKey(options: ResolveOptions = {}): ApiKeyResolution {
  const envValue = options.env ?? process.env.GEMINI_API_KEY ?? ''
  const dotEnvPath = options.dotEnvPath ?? DEFAULT_CLIP_SPLITTER_DOTENV
  const readRegistry = options.readWindowsRegistryKey ?? readWindowsRegistryGeminiKey

  const fromEnv = normalizeApiKey(envValue)
  if (fromEnv) {
    return { key: fromEnv, source: 'env', masked: maskApiKey(fromEnv) }
  }

  const fromDotEnv = parseDotEnvForGeminiKey(dotEnvPath)
  if (fromDotEnv) {
    return { key: fromDotEnv, source: 'clip-splitter-dotenv', masked: maskApiKey(fromDotEnv) }
  }

  const fromRegistry = normalizeApiKey(readRegistry())
  if (fromRegistry) {
    return { key: fromRegistry, source: 'windows-registry', masked: maskApiKey(fromRegistry) }
  }

  return { key: '', source: 'nenhuma', masked: '' }
}
```

- [ ] **Step 4: Rodar testes pra ver eles passarem**

```bash
npx vitest run electron/services/gemini-key-resolver.test.ts
```

Expected: todos passam.

- [ ] **Step 5: Smoke manual no Windows real (verificar registro)**

```bash
node -e "import('./electron/services/gemini-key-resolver.js').then(m => console.log(m.resolveGeminiApiKey()))"
```

(Pode falhar se compilação não estiver pronta — alternativa: rodar via tsx ou após `tsc`.)

Alternativa mais simples — usar `tsx`:

```bash
npx tsx -e "import { resolveGeminiApiKey } from './electron/services/gemini-key-resolver.ts'; const r = resolveGeminiApiKey(); console.log({ source: r.source, masked: r.masked, hasKey: r.key.length > 0 })"
```

Expected: imprime `{ source: 'env'|'clip-splitter-dotenv'|'windows-registry', masked: 'AIza...xyz', hasKey: true }`.

Se output for `source: 'nenhuma'`, confirmar com o user que a chave Gemini está configurada em algum lugar. Se não estiver, anotar no plano e continuar (testes unitários já validaram a lógica — chave real só importa nas fases finais de smoke test).

- [ ] **Step 6: Commit**

```bash
git add electron/services/gemini-key-resolver.ts electron/services/gemini-key-resolver.test.ts
git commit -m "feat(partner-scout-v2): gemini API key resolver com 3 fontes"
```

---

## Task 4: System prompt builder

**Files:**
- Create: `src/modules/partner-scout-v2/agent/system-prompt.ts`
- Create: `src/modules/partner-scout-v2/agent/system-prompt.test.ts`

- [ ] **Step 1: Escrever testes primeiro (TDD)**

Caminho: `src/modules/partner-scout-v2/agent/system-prompt.test.ts`

```typescript
import { describe, expect, it } from 'vitest'

import { ROBERTO_CARECA_PROFILE } from '../data/creator-profile.js'
import type { BrandCacheEntry } from '../data/brand-cache.types.js'
import { buildSystemPrompt } from './system-prompt.js'

const stubMarca = {} as never

const makeCacheEntry = (override: Partial<BrandCacheEntry> = {}): BrandCacheEntry => ({
  nome_normalizado: 'razer',
  nome_display: 'Razer',
  primeira_descoberta: '2026-01-01T00:00:00Z',
  ultima_descoberta: '2026-04-01T00:00:00Z',
  status: 'contatada',
  status_atualizado_em: '2026-04-01T00:00:00Z',
  ultimo_email_usado: 'mkt@razer.com',
  notas: [],
  ultimo_enriquecimento: stubMarca,
  ...override,
})

describe('buildSystemPrompt', () => {
  it('resolve ANO_ATUAL/ANO_ANTERIOR/ANO_PROXIMO baseado em agora', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date('2030-06-15T12:00:00Z'),
      cacheHints: [],
    })

    expect(prompt).toContain('ANO_ATUAL=2030')
    expect(prompt).toContain('ANO_ANTERIOR=2029')
    expect(prompt).toContain('ANO_PROXIMO=2031')
  })

  it('inclui o YAML do criador com inscritos', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date(),
      cacheHints: [],
    })

    expect(prompt).toContain('Roberto Careca')
    expect(prompt).toContain('inscritos: 405000')
  })

  it('lista marcas em cache pra pular quando há entries ativos', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date('2026-04-25T00:00:00Z'),
      cacheHints: [
        makeCacheEntry({ nome_display: 'Razer', status: 'contatada' }),
        makeCacheEntry({ nome_normalizado: 'monster', nome_display: 'Monster Energy', status: 'rejeitada' }),
      ],
    })

    expect(prompt).toContain('PULAR')
    expect(prompt).toContain('Razer (status=contatada')
    expect(prompt).toContain('Monster Energy (status=rejeitada')
  })

  it('mostra mensagem clara quando não há marcas em cache', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date(),
      cacheHints: [],
    })

    expect(prompt).toContain('(nenhuma marca em cache)')
  })

  it('declara as ferramentas Gemini (google_search e url_context) e o contrato mínimo', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date(),
      cacheHints: [],
    })

    expect(prompt).toContain('google_search')
    expect(prompt).toContain('url_context')
    expect(prompt).toContain('CONTRATO DE EXECUÇÃO MÍNIMO')
    expect(prompt).toContain('mínimo 15 vezes')
    expect(prompt).toContain('mínimo 30 candidatos')
    expect(prompt).toContain('mínimo 25 marcas')
  })

  it('contém o texto integral do system prompt original (anti-padrões, fases, score composto)', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date(),
      cacheHints: [],
    })

    expect(prompt).toContain('PARTNER SCOUT')
    expect(prompt).toContain('REGRA TEMPORAL')
    expect(prompt).toContain('Fase 1')
    expect(prompt).toContain('Fase 5')
    expect(prompt).toContain('ANTI-PADRÕES')
    expect(prompt).toContain('score composto')
  })

  it('declara a REGRA DE LANÇAMENTOS pra publishers/plataformas/hardware', () => {
    const prompt = buildSystemPrompt({
      creator: ROBERTO_CARECA_PROFILE,
      agora: new Date(),
      cacheHints: [],
    })

    expect(prompt).toContain('REGRA DE LANÇAMENTOS')
    expect(prompt).toContain('lancamentos_proximos')
    expect(prompt).toContain('publisher')
    expect(prompt).toContain('argumento_pitch')
  })
})
```

- [ ] **Step 2: Rodar pra ver falhar**

```bash
npx vitest run src/modules/partner-scout-v2/agent/system-prompt.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implementar `system-prompt.ts`**

Caminho: `src/modules/partner-scout-v2/agent/system-prompt.ts`

O texto entre as linhas marcadas `// ===== PROMPT BASE INÍCIO =====` e `// ===== PROMPT BASE FIM =====` é o texto original do system prompt do Partner Scout (mensagem do user em 2026-04-25), com 3 ajustes:
- Bloco "FERRAMENTAS DISPONÍVEIS" reescrito pra google_search + url_context
- Bloco "CONTRATO DE EXECUÇÃO MÍNIMO" novo
- Removidas referências a `linkedin_search` e `email_pattern_inference` como tools

```typescript
import type { BrandCacheEntry } from '../data/brand-cache.types.js'
import type { CreatorProfile } from '../data/creator-profile.js'

export interface PromptContext {
  creator: CreatorProfile
  agora: Date
  cacheHints: BrandCacheEntry[]
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function quarterOf(d: Date): string {
  const q = Math.ceil((d.getUTCMonth() + 1) / 3)
  return `Q${q} ${d.getUTCFullYear()}`
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function renderCreatorYaml(c: CreatorProfile): string {
  return `nome: ${c.nome}
canal: ${c.canal}
inscritos: ${c.inscritos}
views_28d: ${c.views_28d}
espectadores_unicos_28d: ${c.espectadores_unicos_28d}
tempo_exibicao_horas_28d: ${c.tempo_exibicao_horas_28d}
retencao_media: ${c.retencao_media}
recorrentes: ${c.recorrentes}
formato_principal: ${c.formato_principal}
views_por_short: ${c.views_por_short}
mei: ${c.mei}
emite_nf: ${c.emite_nf}
canais_localizados: [${c.canais_localizados.join(', ')}]

publico:
  genero:
    masculino: ${c.publico.genero.masculino}
    feminino: ${c.publico.genero.feminino}
  idade:
${Object.entries(c.publico.idade).map(([k, v]) => `    ${k}: ${v}`).join('\n')}
  geografia:
${Object.entries(c.publico.geografia).map(([k, v]) => `    ${k}: ${v}`).join('\n')}
  renda_familiar:
${Object.entries(c.publico.renda_familiar).map(([k, v]) => `    ${k}: ${v}`).join('\n')}
  status_parental:
    nao_pais: ${c.publico.status_parental.nao_pais}
    pais: ${c.publico.status_parental.pais}
  interesses_alto:
${c.publico.interesses_alto.map((i) => `    - ${i}`).join('\n')}
  intencao_compra_alta:
${c.publico.intencao_compra_alta.map((i) => `    - ${i}`).join('\n')}`
}

function renderCacheBlock(hints: BrandCacheEntry[]): string {
  if (hints.length === 0) return '(nenhuma marca em cache)'
  return hints
    .map((b) => `- ${b.nome_display} (status=${b.status}, última prospecção=${b.ultima_descoberta.slice(0, 10)})`)
    .join('\n')
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const ano = ctx.agora.getUTCFullYear()
  const anoAnterior = ano - 1
  const anoProximo = ano + 1
  const trimestre = quarterOf(ctx.agora)
  const mes = monthLabel(ctx.agora)
  const dataIso = isoDate(ctx.agora)
  const creatorYaml = renderCreatorYaml(ctx.creator)
  const cacheBlock = renderCacheBlock(ctx.cacheHints)

  // ===== PROMPT BASE INÍCIO =====
  const promptBase = `# PARTNER SCOUT — SYSTEM PROMPT

Você é o **Partner Scout**, agente especialista em prospecção de parcerias comerciais para criadores de conteúdo brasileiros, integrado ao Careca Studio. Sua missão é descobrir, validar e enriquecer oportunidades de patrocínio acionáveis — não gerar listas genéricas de marcas óbvias.

---

## ⏱️ REGRA TEMPORAL (CRÍTICA — LEIA PRIMEIRO)

Você opera **sempre no presente**. Nunca codifique anos fixos no seu raciocínio nem nas queries.

### Passo 0 — Estabeleça o "agora" antes de qualquer busca

1. A data atual e variáveis temporais já foram resolvidas pelo runtime (veja seção CONTEXTO DE EXECUÇÃO abaixo).
2. Use as variáveis {ANO_ATUAL}, {ANO_ANTERIOR}, {ANO_PROXIMO}, {TRIMESTRE_ATUAL}, {MES_ATUAL}, {JANELA_RECENTE} em todas as queries.
3. **Nunca** use anos fixos (2024, 2025, 2026...) escritos diretamente no seu raciocínio. Use as variáveis.
4. **Validação de frescor:** descarte ou revalide qualquer marca/notícia/dado mencionado apenas em fontes mais antigas que {ANO_ANTERIOR}. Marca que só aparece em notícia de 3+ anos atrás precisa ser confirmada como ativa hoje.
5. Se desconfiar do relógio do sistema (ex: notícias muito recentes contradizem ANO_ATUAL), valide com google_search e ajuste.

---

## FERRAMENTAS DISPONÍVEIS (Gemini)

- **google_search** — grounding nativo Google Search. Use sempre que precisar descobrir marcas, validar campanhas recentes, encontrar press releases, agências, contatos públicos, padrões de email da empresa.
- **url_context** — fetch e leitura de URL específica. Use pra ler /imprensa, /contato, /parcerias, /marketing, /influencers, perfis LinkedIn de Heads de Marketing, sites das marcas.
- linkedin_search NÃO disponível como tool. Use google_search com \`site:linkedin.com\`.
- email_pattern_inference NÃO disponível como tool. Raciocine padrões de email no contexto: se viu \`joao.silva@empresa.com\` num site, infira \`nome.sobrenome@empresa.com\` para outros funcionários.

---

## CONTRATO DE EXECUÇÃO MÍNIMO

- Você DEVE chamar google_search **no mínimo 15 vezes** antes de finalizar.
- Você DEVE descobrir **no mínimo 30 candidatos** antes de aplicar filtros.
- Você DEVE retornar **no mínimo 25 marcas** no \`resultado_final\`.
- Você DEVE produzir o JSON final no schema exato (validado automaticamente — saída malformada falha).
- Não finalize com menos de 15 google_search por economia. Se filtros eliminaram demais, expanda categorias.

## REGRA DE LANÇAMENTOS (CRÍTICA)

Pra cada marca que seja **publisher de jogos** (AAA, indie, mobile), **plataforma gaming** (consoles, lojas, serviços), ou **hardware com calendário de lançamento** (placas de vídeo, periféricos com ciclo de produto), você DEVE preencher \`lancamentos_proximos\` com pelo menos 1 item confirmado nos próximos 6 meses.

- Use google_search com queries do tipo: "[marca] lançamento {ANO_ATUAL}", "[marca] release calendar {ANO_ATUAL} {ANO_PROXIMO}", "[marca] roadmap"
- Cada item: \`titulo\` (nome específico, ex: "Ghost of Yotei", não "novo jogo"), \`data_prevista\` (ISO ou descrição clara tipo "Q3 2026"), \`tipo\` ("jogo" | "produto" | "evento" | "temporada")
- Se de fato não houver lançamento confirmado nos próximos 6 meses pra uma marca de uma dessas categorias, é melhor **eliminá-la no filtro** (timing fraco) do que retornar com array vazio
- Pra categorias **sem calendário** (cosmético, telecom, banco, fintech, energético genérico), array vazio é aceitável

O \`argumento_pitch\` DEVE referenciar pelo menos 1 item de \`lancamentos_proximos\` quando o array não for vazio (ex: "Ghost of Yotei estreia em outubro — meus shorts de react ao trailer entregam X views").

---

## PROCESSO DE DESCOBERTA (siga em ordem)

### Fase 1 — Descoberta ampla (mínimo 30 candidatos)
Para cada categoria abaixo, rode google_search com pelo menos 3 queries diferentes. Toda query deve usar {ANO_ATUAL} ou expressões temporais relativas.

**Categorias-alvo:**
- Hardware & periféricos gamer (BR + internacionais com BR)
- PCs/notebooks gamer
- Energéticos, snacks, bebidas
- Editoras AAA (publishers) — atenção a lançamentos do calendário de {ANO_ATUAL} e {ANO_PROXIMO}
- Editoras indie e mobile
- Lojas de games e key marketplaces
- Cadeiras e mobília gamer
- Telecom, fibra, 5G/6G
- Bancos e fintechs
- iGaming regulado no Brasil (validar status regulatório atual)
- Apps de delivery/mobilidade
- Áudio e tech consumer
- Streetwear e vestuário gamer
- Cosmético masculino e cuidados
- SaaS/apps produtividade para 25-44
- Cursos online e edtech
- Marcas asiáticas entrando no Brasil em {JANELA_RECENTE}
- Categorias emergentes: rode 1 query "tendências patrocínio creator gaming Brasil {ANO_ATUAL}"

**Queries-modelo** (varie sempre, substitua {ANO_ATUAL} pelo ano real):
- "marca [categoria]" "Brasil" patrocínio creator {ANO_ATUAL}
- "[categoria]" "influencer marketing" "Brasil" lançamento {ANO_ATUAL}
- [categoria] entrando no mercado brasileiro {ANO_ATUAL}
- press release [categoria] Brasil expansão {JANELA_RECENTE}
- agência influencer [categoria] case {ANO_ATUAL}
- head marketing [categoria] Brasil site:linkedin.com
- [categoria] campanha gaming Brasil {TRIMESTRE_ATUAL}

### Fase 2 — Filtros ELIMINATÓRIOS
Descarte automaticamente toda marca que:
- ❌ Não tenha operação ativa no Brasil verificada em {JANELA_RECENTE}
- ❌ Já apareceu em campanhas com 5+ canais gaming BR no último ano (saturadas)
- ❌ Tenha ticket médio abaixo da renda do público (público é 59% A/B+)
- ❌ Esteja no cache como "respondida sem retorno" há menos de 90 dias (veja MARCAS EM CACHE abaixo)
- ❌ Conflite com cláusula de exclusividade ativa do criador
- ❌ Última notícia/atividade pública seja anterior a {ANO_ANTERIOR} sem evidência de operação atual

### Fase 3 — Enriquecimento de cada candidato
Para cada marca que passou o filtro, faça url_context/google_search pra preencher TODOS os campos do schema (marca, categoria, site, operacao_brasil, ultima_atividade_publica, porte, campanhas_recentes_creator, fit_demografico, tipo_publi_recomendado, ticket_estimado_brl, contato, argumento_pitch, alertas).

### Fase 4 — Busca de email (CRÍTICO — não pode falhar silenciosamente)

Tente nesta ordem, parando ao primeiro sucesso:
1. **Site oficial** — url_context do rodapé, /contato, /imprensa, /press, /parcerias, /marketing, /influencers, /creators, /midia
2. **LinkedIn** — google_search "Head of Marketing [marca] Brasil site:linkedin.com", "Influencer Marketing Manager [marca] site:linkedin.com"
3. **Padrão de email** — se identificou um funcionário no LinkedIn com email confirmado em outro lugar, infira o padrão (\`nome.sobrenome@\`, \`n.sobrenome@\`, \`nome@\`)
4. **Agências** — descubra se a marca é representada por agência (Mynd, Spark, Cubo Network, BrandLovers, Squad Digital, Hype etc — valide quais ainda existem na execução atual)
5. **Formulário de parceria** — se nada acima funcionar, registre a URL do formulário público

Sempre marque \`editavel: true\`. Se nenhum método funcionou, retorne \`email_primario: null\` e \`fonte_email: "nao_localizado"\`.

### Fase 5 — Ranking e output

Ordene por **score composto**:
score = (fit_demografico * 0.35) + (probabilidade_resposta * 0.25) + (ticket_estimado_ideal_normalizado * 0.20) + (originalidade * 0.20)

Retorne mínimo 25 marcas, agrupadas por categoria, mais um TOP 10 destacado.

---

## REGRAS DE QUALIDADE (anti-genérico)

1. **Justificativa de fit não pode ser intercambiável.** Se você consegue trocar o nome da marca na justificativa e ela continua válida, está genérica — reescreva.
2. **Cada categoria precisa de pelo menos 1 marca não-óbvia** (não-top-of-mind).
3. **Pitch específico, nunca template.** Use sempre 1 número do canal + 1 dado do público + 1 conexão com o produto da marca.
4. **Se o ticket parece chutado, recalcule.** Use CPM gaming BR atual (busque benchmark vigente em {ANO_ATUAL}), retenção 88% (acima da média = +20-40% no ticket), e tipo de publi.
5. **Reporte o que falhou.** Se não achou email, diga onde tentou. Não invente email — \`null\` é melhor que erro.
6. **Tudo verificado em tempo real.** Não confie em memória interna sobre quais marcas existem. Sempre valide com google_search na execução atual.

---

## ANTI-PADRÕES — NÃO FAÇA

- Não retorne só nomes de marcas sem enriquecimento.
- Não invente email "comercial@marca.com" se não confirmou que existe.
- Não copie justificativa entre marcas mudando só o nome do produto.
- Não ignore o cache — repetir as mesmas marcas toda execução é o que torna o output genérico.
- Não retorne menos de 25 marcas. Se filtros eliminaram demais, expanda categorias.
- Não esqueça de marcar \`editavel: true\` em todo campo de contato.
- Nunca codifique ano fixo no raciocínio. Sempre use as variáveis temporais.
- Não confie em conhecimento interno sobre o "estado atual" de marcas, agências ou regulações — tudo precisa ser validado por busca na execução.`
  // ===== PROMPT BASE FIM =====

  return `${promptBase}

---

## CONTEXTO DE EXECUÇÃO (preenchido pelo runtime)

Data de hoje (do sistema): ${dataIso}

Variáveis temporais resolvidas (use estas em vez de anos fixos):
  ANO_ATUAL=${ano}
  ANO_ANTERIOR=${anoAnterior}
  ANO_PROXIMO=${anoProximo}
  TRIMESTRE_ATUAL=${trimestre}
  MES_ATUAL=${mes}
  JANELA_RECENTE="últimos 6 meses até ${dataIso}"

## CONTEXTO DO CRIADOR (snapshot atual)

${creatorYaml}

## MARCAS EM CACHE — PULAR (status ativo nos últimos 90 dias)

${cacheBlock}
`
}
```

- [ ] **Step 4: Rodar testes pra ver eles passarem**

```bash
npx vitest run src/modules/partner-scout-v2/agent/system-prompt.test.ts
```

Expected: 6 testes passam.

- [ ] **Step 5: Verificar tsc**

```bash
npx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 6: Commit**

```bash
git add src/modules/partner-scout-v2/agent/system-prompt.ts src/modules/partner-scout-v2/agent/system-prompt.test.ts
git commit -m "feat(partner-scout-v2): system prompt builder com variáveis temporais e cache hint"
```

---

## Task 5: Brand cache service + normalize util

**Files:**
- Create: `src/modules/partner-scout-v2/utils/normalize-brand-name.ts`
- Create: `src/modules/partner-scout-v2/utils/normalize-brand-name.test.ts`
- Create: `electron/services/brand-cache.ts`
- Create: `electron/services/brand-cache.test.ts`

- [ ] **Step 1: Teste do normalize-brand-name**

Caminho: `src/modules/partner-scout-v2/utils/normalize-brand-name.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { normalizeBrandName } from './normalize-brand-name.js'

describe('normalizeBrandName', () => {
  it('lowercase', () => {
    expect(normalizeBrandName('Razer')).toBe('razer')
  })

  it('remove acentos', () => {
    expect(normalizeBrandName('Açaí')).toBe('acai')
    expect(normalizeBrandName('Café Pelé')).toBe('cafe pele')
  })

  it('remove pontuação e domínios', () => {
    expect(normalizeBrandName('razer.com')).toBe('razer')
    expect(normalizeBrandName('Razer Inc.')).toBe('razer inc')
    expect(normalizeBrandName('Logitech G®')).toBe('logitech g')
  })

  it('colapsa espaços múltiplos', () => {
    expect(normalizeBrandName('  Hyper   X  ')).toBe('hyper x')
  })

  it('"Razer" e "Razer Brasil" colidem propositalmente apenas se forem iguais — testa só normalização, não dedup', () => {
    expect(normalizeBrandName('Razer Brasil')).toBe('razer brasil')
    expect(normalizeBrandName('Razer')).toBe('razer')
  })
})
```

- [ ] **Step 2: Implementar normalize-brand-name**

Caminho: `src/modules/partner-scout-v2/utils/normalize-brand-name.ts`

```typescript
const TLD_REGEX = /\.(com|br|net|org|io|co|gg|tv|app|store)(\.[a-z]{2})?$/i

export function normalizeBrandName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(TLD_REGEX, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
```

- [ ] **Step 3: Rodar e verificar**

```bash
npx vitest run src/modules/partner-scout-v2/utils/normalize-brand-name.test.ts
```

Expected: 5 passam.

- [ ] **Step 4: Teste do brand-cache (TDD com diretório tmp)**

Caminho: `electron/services/brand-cache.test.ts`

```typescript
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createBrandCache, type BrandCache } from './brand-cache.js'
import type { MarcaProspectada } from '../../src/modules/partner-scout-v2/agent/schema.js'

const FIXED_NOW = '2026-04-25T12:00:00.000Z'
const fixedClock = () => new Date(FIXED_NOW)

const stubMarca = (override: Partial<MarcaProspectada> = {}): MarcaProspectada => ({
  marca: 'Razer',
  categoria: 'Hardware',
  site: 'razer.com',
  operacao_brasil: 'confirmada',
  ultima_atividade_publica: '2026-03-01',
  porte: 'global',
  campanhas_recentes_creator: [],
  fit_demografico: { score: 8, justificativa: 'fit alto' },
  tipo_publi_recomendado: 'short_patrocinado',
  ticket_estimado_brl: { minimo: 5000, ideal: 10000, premium: 18000, base_calculo: 'cpm gaming br' },
  contato: {
    email_primario: 'mkt@razer.com',
    email_alternativo: null,
    fonte_email: 'razer.com/contato',
    editavel: true,
    linkedin_decisor: { nome: null, cargo: null, url: null },
    agencia_representante: null,
    formulario_parcerias: null,
  },
  argumento_pitch: 'pitch específico',
  alertas: [],
  ...override,
})

describe('BrandCache', () => {
  let dir: string
  let cache: BrandCache

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'brand-cache-'))
    cache = createBrandCache({ cwd: dir, name: 'test', clock: fixedClock })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('upsertFromRun cria entry novo com primeira_descoberta = ultima_descoberta = agora', () => {
    cache.upsertFromRun(stubMarca())
    const entry = cache.findByName('razer')
    expect(entry).not.toBeNull()
    expect(entry!.primeira_descoberta).toBe(FIXED_NOW)
    expect(entry!.ultima_descoberta).toBe(FIXED_NOW)
    expect(entry!.status).toBe('descoberta')
    expect(entry!.nome_display).toBe('Razer')
  })

  it('upsertFromRun em entry existente atualiza ultima_descoberta e ultimo_enriquecimento, preserva primeira_descoberta e status', () => {
    cache.upsertFromRun(stubMarca())
    cache.setStatus('razer', 'a_contatar')

    const newClock = () => new Date('2026-05-10T00:00:00.000Z')
    const cache2 = createBrandCache({ cwd: dir, name: 'test', clock: newClock })
    cache2.upsertFromRun(stubMarca({ argumento_pitch: 'pitch atualizado' }))

    const entry = cache2.findByName('razer')
    expect(entry!.primeira_descoberta).toBe(FIXED_NOW)
    expect(entry!.ultima_descoberta).toBe('2026-05-10T00:00:00.000Z')
    expect(entry!.status).toBe('a_contatar')
    expect(entry!.ultimo_enriquecimento.argumento_pitch).toBe('pitch atualizado')
  })

  it('setStatus atualiza status e status_atualizado_em', () => {
    cache.upsertFromRun(stubMarca())
    cache.setStatus('razer', 'contatada', 'enviei email em 25/04')

    const entry = cache.findByName('razer')
    expect(entry!.status).toBe('contatada')
    expect(entry!.status_atualizado_em).toBe(FIXED_NOW)
    expect(entry!.notas[0]?.text).toContain('25/04')
  })

  it('updateContact aplica patch parcial em contato', () => {
    cache.upsertFromRun(stubMarca())
    cache.updateContact('razer', { email_primario: 'novo@razer.com' })

    const entry = cache.findByName('razer')
    expect(entry!.ultimo_enriquecimento.contato.email_primario).toBe('novo@razer.com')
  })

  it('addNote adiciona nota livre com timestamp', () => {
    cache.upsertFromRun(stubMarca())
    cache.addNote('razer', 'lembrete: follow up em 30d')

    const entry = cache.findByName('razer')
    expect(entry!.notas).toHaveLength(1)
    expect(entry!.notas[0]?.text).toBe('lembrete: follow up em 30d')
    expect(entry!.notas[0]?.ts).toBe(FIXED_NOW)
  })

  it('getActiveSkipList(90) retorna apenas entries com status "ativo" dentro da janela', () => {
    cache.upsertFromRun(stubMarca({ marca: 'Marca Antiga' }))
    cache.setStatus('marca antiga', 'contatada')

    cache.upsertFromRun(stubMarca({ marca: 'Marca Nova Descoberta' }))
    // status fica 'descoberta' por padrão — NÃO entra na skip list

    cache.upsertFromRun(stubMarca({ marca: 'Marca a Contatar' }))
    cache.setStatus('marca a contatar', 'a_contatar')
    // 'a_contatar' NÃO entra na skip list

    const skip = cache.getActiveSkipList(90)
    const names = skip.map((e) => e.nome_normalizado)
    expect(names).toContain('marca antiga')
    expect(names).not.toContain('marca nova descoberta')
    expect(names).not.toContain('marca a contatar')
  })

  it('getActiveSkipList(90) ignora entries com status_atualizado_em > 90 dias atrás', () => {
    cache.upsertFromRun(stubMarca())
    cache.setStatus('razer', 'rejeitada')

    // simula passagem de 100 dias
    const futureClock = () => new Date('2026-08-03T00:00:00.000Z')  // FIXED_NOW + 100d
    const cache2 = createBrandCache({ cwd: dir, name: 'test', clock: futureClock })
    const skip = cache2.getActiveSkipList(90)
    expect(skip).toHaveLength(0)
  })

  it('list retorna entries ordenados por ultima_descoberta desc', () => {
    cache.upsertFromRun(stubMarca({ marca: 'Antiga' }))
    const cache2 = createBrandCache({
      cwd: dir,
      name: 'test',
      clock: () => new Date('2026-05-01T00:00:00.000Z'),
    })
    cache2.upsertFromRun(stubMarca({ marca: 'Recente' }))

    const list = cache2.list()
    expect(list[0]?.nome_normalizado).toBe('recente')
    expect(list[1]?.nome_normalizado).toBe('antiga')
  })

  it('persiste entre instâncias (escreve no disco)', () => {
    cache.upsertFromRun(stubMarca())

    const cache2 = createBrandCache({ cwd: dir, name: 'test', clock: fixedClock })
    expect(cache2.findByName('razer')).not.toBeNull()
  })
})
```

- [ ] **Step 5: Implementar `brand-cache.ts`**

Caminho: `electron/services/brand-cache.ts`

```typescript
import Store from 'electron-store'

import type {
  BrandCacheEntry,
  BrandStatus,
} from '../../src/modules/partner-scout-v2/data/brand-cache.types.js'
import { BRAND_STATUS_ATIVO } from '../../src/modules/partner-scout-v2/data/brand-cache.types.js'
import type {
  ContatoMarca,
  MarcaProspectada,
} from '../../src/modules/partner-scout-v2/agent/schema.js'
import { normalizeBrandName } from '../../src/modules/partner-scout-v2/utils/normalize-brand-name.js'

interface BrandCacheStoreSchema {
  entries: Record<string, BrandCacheEntry>
}

export interface CreateBrandCacheOptions {
  cwd?: string
  name?: string
  clock?: () => Date
}

export interface BrandCache {
  findByName: (name: string) => BrandCacheEntry | null
  list: () => BrandCacheEntry[]
  upsertFromRun: (marca: MarcaProspectada) => BrandCacheEntry
  setStatus: (normalized: string, status: BrandStatus, nota?: string) => BrandCacheEntry
  updateContact: (normalized: string, patch: Partial<ContatoMarca>) => BrandCacheEntry
  addNote: (normalized: string, text: string) => BrandCacheEntry
  getActiveSkipList: (windowDays: number) => BrandCacheEntry[]
  clear: () => void
}

export function createBrandCache(options: CreateBrandCacheOptions = {}): BrandCache {
  const clock = options.clock ?? (() => new Date())
  const store = new Store<BrandCacheStoreSchema>({
    name: options.name ?? 'partner-scout-cache',
    cwd: options.cwd,
    defaults: { entries: {} },
  })

  const getEntries = (): Record<string, BrandCacheEntry> => store.get('entries')
  const setEntries = (e: Record<string, BrandCacheEntry>) => store.set('entries', e)

  const requireEntry = (normalized: string): BrandCacheEntry => {
    const entry = getEntries()[normalized]
    if (!entry) throw new Error(`Brand cache: entry "${normalized}" não encontrada`)
    return entry
  }

  return {
    findByName(name) {
      const key = normalizeBrandName(name)
      return getEntries()[key] ?? null
    },

    list() {
      return Object.values(getEntries()).sort((a, b) =>
        b.ultima_descoberta.localeCompare(a.ultima_descoberta),
      )
    },

    upsertFromRun(marca) {
      const now = clock().toISOString()
      const normalized = normalizeBrandName(marca.marca)
      const entries = getEntries()
      const existing = entries[normalized]

      const next: BrandCacheEntry = existing
        ? {
            ...existing,
            ultima_descoberta: now,
            ultimo_enriquecimento: marca,
          }
        : {
            nome_normalizado: normalized,
            nome_display: marca.marca,
            primeira_descoberta: now,
            ultima_descoberta: now,
            status: 'descoberta',
            status_atualizado_em: now,
            ultimo_email_usado: null,
            notas: [],
            ultimo_enriquecimento: marca,
          }

      entries[normalized] = next
      setEntries(entries)
      return next
    },

    setStatus(normalized, status, nota) {
      const now = clock().toISOString()
      const entries = getEntries()
      const entry = requireEntry(normalized)
      const updated: BrandCacheEntry = {
        ...entry,
        status,
        status_atualizado_em: now,
        notas: nota ? [...entry.notas, { ts: now, text: nota }] : entry.notas,
      }
      entries[normalized] = updated
      setEntries(entries)
      return updated
    },

    updateContact(normalized, patch) {
      const entries = getEntries()
      const entry = requireEntry(normalized)
      const updated: BrandCacheEntry = {
        ...entry,
        ultimo_enriquecimento: {
          ...entry.ultimo_enriquecimento,
          contato: { ...entry.ultimo_enriquecimento.contato, ...patch },
        },
        ultimo_email_usado: patch.email_primario ?? entry.ultimo_email_usado,
      }
      entries[normalized] = updated
      setEntries(entries)
      return updated
    },

    addNote(normalized, text) {
      const now = clock().toISOString()
      const entries = getEntries()
      const entry = requireEntry(normalized)
      const updated: BrandCacheEntry = {
        ...entry,
        notas: [...entry.notas, { ts: now, text }],
      }
      entries[normalized] = updated
      setEntries(entries)
      return updated
    },

    getActiveSkipList(windowDays) {
      const cutoff = clock().getTime() - windowDays * 24 * 60 * 60 * 1000
      return Object.values(getEntries()).filter((e) => {
        if (!BRAND_STATUS_ATIVO.includes(e.status)) return false
        const ts = new Date(e.status_atualizado_em).getTime()
        return ts >= cutoff
      })
    },

    clear() {
      setEntries({})
    },
  }
}
```

- [ ] **Step 6: Rodar testes**

```bash
npx vitest run electron/services/brand-cache.test.ts src/modules/partner-scout-v2/utils/normalize-brand-name.test.ts
```

Expected: todos passam.

- [ ] **Step 7: Verificar tsc**

```bash
npx tsc --noEmit
```

Expected: zero erros.

- [ ] **Step 8: Commit**

```bash
git add src/modules/partner-scout-v2/utils electron/services/brand-cache.ts electron/services/brand-cache.test.ts
git commit -m "feat(partner-scout-v2): brand cache + normalize-brand-name util com testes"
```

---

## Task 6: Run history service

**Files:**
- Create: `electron/services/run-history.ts`
- Create: `electron/services/run-history.test.ts`

- [ ] **Step 1: Testes**

Caminho: `electron/services/run-history.test.ts`

```typescript
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createRunHistory, type RunHistory } from './run-history.js'
import type { ProspectionRun } from '../../src/modules/partner-scout-v2/agent/run.js'

const baseRun = (id: string, startedAt: string): ProspectionRun => ({
  id,
  startedAt,
  finishedAt: null,
  status: 'pending',
  error: null,
  usage: {
    prompt_tokens: 0,
    candidates_tokens: 0,
    cached_content_tokens: 0,
    tool_use_count: 0,
    modelo_efetivo: 'gemini-2.5-flash',
    custo_estimado_usd: 0,
  },
  result: null,
  progressLog: [],
})

describe('RunHistory', () => {
  let dir: string
  let history: RunHistory

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'run-hist-'))
    history = createRunHistory({ cwd: dir, name: 'test', maxRuns: 3 })
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('append + get + list', () => {
    history.append(baseRun('a', '2026-04-01T00:00:00Z'))
    history.append(baseRun('b', '2026-04-02T00:00:00Z'))

    expect(history.get('a')?.id).toBe('a')
    expect(history.list().map((r) => r.id)).toEqual(['b', 'a'])
  })

  it('list limita ao maxRuns mais recente', () => {
    history.append(baseRun('a', '2026-04-01T00:00:00Z'))
    history.append(baseRun('b', '2026-04-02T00:00:00Z'))
    history.append(baseRun('c', '2026-04-03T00:00:00Z'))
    history.append(baseRun('d', '2026-04-04T00:00:00Z'))

    expect(history.list().map((r) => r.id)).toEqual(['d', 'c', 'b'])
    expect(history.get('a')).toBeNull()
  })

  it('update altera campos do run', () => {
    history.append(baseRun('a', '2026-04-01T00:00:00Z'))
    history.update('a', { status: 'done', finishedAt: '2026-04-01T00:05:00Z' })

    expect(history.get('a')?.status).toBe('done')
    expect(history.get('a')?.finishedAt).toBe('2026-04-01T00:05:00Z')
  })

  it('delete remove o run', () => {
    history.append(baseRun('a', '2026-04-01T00:00:00Z'))
    history.delete('a')
    expect(history.get('a')).toBeNull()
  })
})
```

- [ ] **Step 2: Implementar `run-history.ts`**

Caminho: `electron/services/run-history.ts`

```typescript
import Store from 'electron-store'

import type { ProspectionRun } from '../../src/modules/partner-scout-v2/agent/run.js'

interface RunHistoryStoreSchema {
  runs: Record<string, ProspectionRun>
}

export interface CreateRunHistoryOptions {
  cwd?: string
  name?: string
  maxRuns?: number
}

export interface RunHistory {
  append: (run: ProspectionRun) => void
  update: (id: string, patch: Partial<ProspectionRun>) => void
  get: (id: string) => ProspectionRun | null
  list: () => ProspectionRun[]
  delete: (id: string) => void
  clear: () => void
}

export function createRunHistory(options: CreateRunHistoryOptions = {}): RunHistory {
  const maxRuns = options.maxRuns ?? 20
  const store = new Store<RunHistoryStoreSchema>({
    name: options.name ?? 'partner-scout-runs',
    cwd: options.cwd,
    defaults: { runs: {} },
  })

  const getRuns = () => store.get('runs')
  const setRuns = (r: Record<string, ProspectionRun>) => store.set('runs', r)

  const enforceLimit = (runs: Record<string, ProspectionRun>) => {
    const sorted = Object.values(runs).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    const keep = sorted.slice(0, maxRuns)
    const next: Record<string, ProspectionRun> = {}
    for (const r of keep) next[r.id] = r
    return next
  }

  return {
    append(run) {
      const runs = getRuns()
      runs[run.id] = run
      setRuns(enforceLimit(runs))
    },
    update(id, patch) {
      const runs = getRuns()
      const existing = runs[id]
      if (!existing) return
      runs[id] = { ...existing, ...patch }
      setRuns(runs)
    },
    get(id) {
      return getRuns()[id] ?? null
    },
    list() {
      return Object.values(getRuns()).sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    },
    delete(id) {
      const runs = getRuns()
      delete runs[id]
      setRuns(runs)
    },
    clear() {
      setRuns({})
    },
  }
}
```

- [ ] **Step 3: Rodar testes**

```bash
npx vitest run electron/services/run-history.test.ts
```

Expected: 4 passam.

- [ ] **Step 4: Commit**

```bash
git add electron/services/run-history.ts electron/services/run-history.test.ts
git commit -m "feat(partner-scout-v2): run history service com cap de N runs"
```

---

## Task 7: Agent runner (Gemini REST + tool loop)

**Files:**
- Create: `electron/services/partner-scout-agent.ts`
- Create: `electron/services/partner-scout-agent.test.ts`
- Create: `scripts/test-partner-scout-real.ts` (smoke test CLI)

Esta é a tarefa mais complexa. Quebrada em sub-passos.

### 7.1 — Constantes e helpers

- [ ] **Step 1: Definir constantes de modelo + custo**

Caminho: `electron/services/partner-scout-agent.ts` (criar agora, vai crescer)

```typescript
import { randomUUID } from 'node:crypto'

import type { CreatorProfile } from '../../src/modules/partner-scout-v2/data/creator-profile.js'
import type { BrandCacheEntry } from '../../src/modules/partner-scout-v2/data/brand-cache.types.js'
import type {
  ProspectionRun,
  RunProgressEvent,
  RunUsage,
} from '../../src/modules/partner-scout-v2/agent/run.js'
import type { ProspectionResult } from '../../src/modules/partner-scout-v2/agent/schema.js'
import { GEMINI_PROSPECTION_SCHEMA } from '../../src/modules/partner-scout-v2/agent/gemini-schema.js'
import { buildSystemPrompt } from '../../src/modules/partner-scout-v2/agent/system-prompt.js'

export const GEMINI_MODEL_FALLBACK_CHAIN = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
] as const

// Pricing por 1M tokens (Apr 2026 — confirmar antes de prod).
const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.5-pro': { input: 1.25, output: 10.0 },
}
const GROUNDING_COST_PER_REQUEST = 35 / 1000  // $35 / 1k requests

export function estimateCostUsd(usage: Pick<RunUsage, 'prompt_tokens' | 'candidates_tokens' | 'tool_use_count' | 'modelo_efetivo'>): number {
  const p = PRICING[usage.modelo_efetivo] ?? PRICING['gemini-2.5-flash']!
  const inputCost = (usage.prompt_tokens / 1_000_000) * p.input
  const outputCost = (usage.candidates_tokens / 1_000_000) * p.output
  const groundingCost = usage.tool_use_count * GROUNDING_COST_PER_REQUEST
  return Number((inputCost + outputCost + groundingCost).toFixed(4))
}
```

- [ ] **Step 2: Types públicos do runner**

Adicionar ao mesmo arquivo:

```typescript
export interface RunOptions {
  apiKey: string
  creator: CreatorProfile
  cacheHints: BrandCacheEntry[]
  modelChain?: readonly string[]
  maxToolCalls?: number
  timeoutMs?: number
  signal?: AbortSignal
  onProgress?: (event: RunProgressEvent) => void
  fetchImpl?: typeof fetch
}

export interface RunOutcome {
  run: ProspectionRun
  result: ProspectionResult | null
}
```

### 7.2 — Loop de chamadas Gemini

- [ ] **Step 3: Implementar a chamada principal**

Adicionar ao mesmo arquivo:

```typescript
const DEFAULT_MAX_TOOL_CALLS = 50
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface GeminiPart {
  text?: string
  functionCall?: { name: string; args: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
}

interface GeminiCandidate {
  content?: GeminiContent
  finishReason?: string
  groundingMetadata?: { webSearchQueries?: string[] }
}

interface GeminiResponse {
  candidates?: GeminiCandidate[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    cachedContentTokenCount?: number
  }
  error?: { code: number; message: string }
}

function makeUrl(model: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
}

function buildRequestBody(systemPrompt: string, conversation: GeminiContent[]) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: conversation,
    tools: [{ google_search: {} }, { url_context: {} }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_PROSPECTION_SCHEMA,
      maxOutputTokens: 16384,
      temperature: 0.4,
    },
  }
}

async function callGeminiOnce(
  model: string,
  apiKey: string,
  body: unknown,
  signal: AbortSignal | undefined,
  fetchImpl: typeof fetch,
): Promise<{ status: number; data: GeminiResponse }> {
  const response = await fetchImpl(makeUrl(model, apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  const data = (await response.json()) as GeminiResponse
  return { status: response.status, data }
}
```

- [ ] **Step 4: Implementar `runProspection` com fallback chain + tool loop**

Adicionar ao mesmo arquivo:

```typescript
export async function runProspection(options: RunOptions): Promise<RunOutcome> {
  const {
    apiKey,
    creator,
    cacheHints,
    modelChain = GEMINI_MODEL_FALLBACK_CHAIN,
    maxToolCalls = DEFAULT_MAX_TOOL_CALLS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    onProgress,
    fetchImpl = fetch,
  } = options

  const id = randomUUID()
  const startedAt = new Date().toISOString()
  const progressLog: RunProgressEvent[] = []

  const emit = (event: RunProgressEvent) => {
    progressLog.push(event)
    onProgress?.(event)
  }

  const abortCtl = new AbortController()
  const timeoutHandle = setTimeout(() => abortCtl.abort(new Error('timeout')), timeoutMs)
  externalSignal?.addEventListener('abort', () => abortCtl.abort(externalSignal.reason))

  const systemPrompt = buildSystemPrompt({ creator, agora: new Date(), cacheHints })

  const usage: RunUsage = {
    prompt_tokens: 0,
    candidates_tokens: 0,
    cached_content_tokens: 0,
    tool_use_count: 0,
    modelo_efetivo: modelChain[0]!,
    custo_estimado_usd: 0,
  }

  const conversation: GeminiContent[] = [
    { role: 'user', parts: [{ text: 'Inicie o processo de prospecção conforme o system prompt. Produza o JSON final no schema.' }] },
  ]

  let finalText: string | null = null
  let lastError: string | null = null

  modelLoop: for (const model of modelChain) {
    usage.modelo_efetivo = model
    if (model !== modelChain[0]) {
      emit({ ts: new Date().toISOString(), kind: 'fallback', detail: `⚠ tentando modelo ${model}` })
    }

    let iteration = 0
    while (iteration++ < maxToolCalls + 5) {
      if (abortCtl.signal.aborted) {
        lastError = 'aborted'
        break modelLoop
      }
      if (usage.tool_use_count >= maxToolCalls) {
        conversation.push({
          role: 'user',
          parts: [{ text: `LIMITE DE ${maxToolCalls} TOOL CALLS ATINGIDO. Finalize agora com o JSON do que você já tem, no schema exato.` }],
        })
      }

      const body = buildRequestBody(systemPrompt, conversation)
      const { status, data } = await callGeminiOnce(model, apiKey, body, abortCtl.signal, fetchImpl)

      if (status === 429 || status === 503) {
        emit({ ts: new Date().toISOString(), kind: 'fallback', detail: `⚠ ${model} retornou ${status}` })
        lastError = `${status}: ${data.error?.message ?? 'rate limit'}`
        continue modelLoop
      }
      if (status >= 400 || data.error) {
        lastError = data.error?.message ?? `HTTP ${status}`
        emit({ ts: new Date().toISOString(), kind: 'error', detail: lastError })
        break modelLoop
      }

      const meta = data.usageMetadata ?? {}
      usage.prompt_tokens = meta.promptTokenCount ?? usage.prompt_tokens
      usage.candidates_tokens = meta.candidatesTokenCount ?? usage.candidates_tokens
      usage.cached_content_tokens = meta.cachedContentTokenCount ?? usage.cached_content_tokens

      const candidate = data.candidates?.[0]
      if (!candidate) {
        lastError = 'no candidate in Gemini response'
        emit({ ts: new Date().toISOString(), kind: 'error', detail: lastError })
        break modelLoop
      }

      const parts = candidate.content?.parts ?? []
      const functionCalls = parts.filter((p) => p.functionCall)

      // grounding queries (google_search faz por baixo dos panos, sem function call explícita)
      const groundingQueries = candidate.groundingMetadata?.webSearchQueries ?? []
      for (const q of groundingQueries) {
        usage.tool_use_count += 1
        emit({ ts: new Date().toISOString(), kind: 'tool_use', detail: `🔍 google_search: "${q}"` })
      }

      if (functionCalls.length > 0) {
        // url_context retorna como function_call que precisa de function_response do nosso lado
        conversation.push({ role: 'model', parts })
        const responseParts: GeminiPart[] = functionCalls.map((p) => {
          const name = p.functionCall!.name
          usage.tool_use_count += 1
          emit({
            ts: new Date().toISOString(),
            kind: 'tool_use',
            detail: `📄 ${name}: ${JSON.stringify(p.functionCall!.args)}`,
          })
          return {
            functionResponse: {
              name,
              response: { ack: true },
            },
          }
        })
        conversation.push({ role: 'user', parts: responseParts })
        continue
      }

      // sem function calls = resposta final
      const textPart = parts.find((p) => p.text)?.text ?? ''
      if (!textPart) {
        lastError = 'resposta sem texto e sem function calls'
        emit({ ts: new Date().toISOString(), kind: 'error', detail: lastError })
        break modelLoop
      }

      finalText = textPart
      lastError = null
      break modelLoop
    }
  }

  clearTimeout(timeoutHandle)

  let result: ProspectionResult | null = null
  if (finalText) {
    try {
      result = JSON.parse(finalText) as ProspectionResult
    } catch (e) {
      lastError = `JSON parse failed: ${(e as Error).message}`
      emit({ ts: new Date().toISOString(), kind: 'error', detail: lastError })
    }
  }

  usage.custo_estimado_usd = estimateCostUsd(usage)

  const finishedAt = new Date().toISOString()
  const status = lastError === 'aborted' ? 'aborted' : result ? 'done' : 'error'

  const run: ProspectionRun = {
    id,
    startedAt,
    finishedAt,
    status,
    error: lastError,
    usage,
    result,
    progressLog,
  }

  return { run, result }
}
```

### 7.3 — Testes do agent runner (mock fetch)

- [ ] **Step 5: Teste — caso happy path com mock**

Caminho: `electron/services/partner-scout-agent.test.ts`

```typescript
import { describe, expect, it, vi } from 'vitest'

import { runProspection, estimateCostUsd } from './partner-scout-agent.js'
import { ROBERTO_CARECA_PROFILE } from '../../src/modules/partner-scout-v2/data/creator-profile.js'

const minimalProspectionResultJson = JSON.stringify({
  executado_em: '2026-04-25T12:00:00Z',
  ano_referencia: 2026,
  janela_temporal_busca: 'jan-jun 2026',
  criador: 'Roberto Careca',
  queries_executadas: ['q1'],
  candidatos_descobertos: 1,
  filtrados: 0,
  resultado_final: [],
  top_10_destaque: [],
  estatisticas_busca: {
    emails_encontrados: 0,
    emails_inferidos: 0,
    emails_nao_localizados: 0,
    categorias_cobertas: 1,
  },
  proximas_acoes_sugeridas: [],
})

describe('runProspection', () => {
  it('happy path — mock retorna texto final, parse passa, status done', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: { role: 'model', parts: [{ text: minimalProspectionResultJson }] },
            finishReason: 'STOP',
            groundingMetadata: { webSearchQueries: ['q1', 'q2'] },
          },
        ],
        usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 500 },
      }),
    })

    const { run, result } = await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(run.status).toBe('done')
    expect(result).not.toBeNull()
    expect(run.usage.tool_use_count).toBe(2)
    expect(run.usage.prompt_tokens).toBe(1000)
    expect(run.usage.modelo_efetivo).toBe('gemini-2.5-flash')
    expect(run.usage.custo_estimado_usd).toBeGreaterThan(0)
  })

  it('fallback chain — primeiro modelo retorna 429, segundo retorna 200', async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return {
          status: 429,
          json: async () => ({ error: { code: 429, message: 'rate limit' } }),
        }
      }
      return {
        status: 200,
        json: async () => ({
          candidates: [{ content: { role: 'model', parts: [{ text: minimalProspectionResultJson }] } }],
          usageMetadata: {},
        }),
      }
    })

    const events: string[] = []
    const { run } = await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      fetchImpl: fetchMock as unknown as typeof fetch,
      onProgress: (e) => events.push(`${e.kind}:${e.detail}`),
    })

    expect(run.status).toBe('done')
    expect(run.usage.modelo_efetivo).toBe('gemini-2.5-flash-lite')
    expect(events.some((e) => e.startsWith('fallback:'))).toBe(true)
  })

  it('todos os modelos falham — status error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 429,
      json: async () => ({ error: { code: 429, message: 'rate limit' } }),
    })

    const { run } = await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(run.status).toBe('error')
    expect(run.error).toContain('429')
  })

  it('JSON parse falha — status error com mensagem clara', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({
        candidates: [{ content: { role: 'model', parts: [{ text: 'NÃO É JSON' }] } }],
        usageMetadata: {},
      }),
    })

    const { run, result } = await runProspection({
      apiKey: 'AIzaTest',
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints: [],
      fetchImpl: fetchMock as unknown as typeof fetch,
    })

    expect(result).toBeNull()
    expect(run.status).toBe('error')
    expect(run.error).toContain('JSON parse failed')
  })

  it('estimateCostUsd respeita pricing por modelo', () => {
    const cost = estimateCostUsd({
      prompt_tokens: 100_000,
      candidates_tokens: 10_000,
      tool_use_count: 20,
      modelo_efetivo: 'gemini-2.5-flash',
    })
    // 100k * 0.30/M = 0.03 + 10k * 2.50/M = 0.025 + 20 * 0.035 = 0.70
    expect(cost).toBeCloseTo(0.755, 2)
  })
})
```

- [ ] **Step 6: Rodar testes**

```bash
npx vitest run electron/services/partner-scout-agent.test.ts
```

Expected: 5 passam.

### 7.4 — Smoke test CLI com chave real

- [ ] **Step 7: Criar script de smoke test**

Caminho: `scripts/test-partner-scout-real.ts`

```typescript
import { runProspection } from '../electron/services/partner-scout-agent.js'
import { resolveGeminiApiKey } from '../electron/services/gemini-key-resolver.js'
import { ROBERTO_CARECA_PROFILE } from '../src/modules/partner-scout-v2/data/creator-profile.js'

const { key, source } = resolveGeminiApiKey()
if (!key) {
  console.error('❌ Gemini API key não encontrada em nenhuma das 3 fontes')
  process.exit(1)
}
console.log(`✓ Chave Gemini de fonte: ${source}`)
console.log('Iniciando run de smoke (pode demorar 2-5min)...\n')

const { run, result } = await runProspection({
  apiKey: key,
  creator: ROBERTO_CARECA_PROFILE,
  cacheHints: [],
  maxToolCalls: 20,  // reduzido pra smoke
  onProgress: (e) => console.log(`[${e.kind}] ${e.detail}`),
})

console.log('\n=== RESULTADO ===')
console.log(`status: ${run.status}`)
console.log(`error: ${run.error}`)
console.log(`modelo: ${run.usage.modelo_efetivo}`)
console.log(`tool_use: ${run.usage.tool_use_count}`)
console.log(`custo: US$ ${run.usage.custo_estimado_usd}`)
console.log(`marcas no resultado: ${result?.resultado_final.length ?? 0}`)
if (result) {
  console.log('\nPrimeira marca:')
  console.log(JSON.stringify(result.resultado_final[0], null, 2))
}
```

- [ ] **Step 8: Adicionar `tsx` como dev dependency e rodar smoke**

```bash
npm install --save-dev tsx
npx tsx scripts/test-partner-scout-real.ts
```

Expected: roda 2-5min, imprime logs, conclui com `status: done` e `marcas no resultado: >= 5` (com `maxToolCalls: 20` reduzido, esperar menos marcas que produção).

Se falhar com erro de chave, abortar e debugar antes de seguir. Se falhar com erro de schema (responseSchema rejeitada), revisar `gemini-schema.ts` (campos required vs nullable).

- [ ] **Step 9: Commit**

```bash
git add electron/services/partner-scout-agent.ts electron/services/partner-scout-agent.test.ts scripts/test-partner-scout-real.ts package.json package-lock.json
git commit -m "feat(partner-scout-v2): agent runner com fallback chain, tool loop, smoke CLI"
```

---

## Task 8: IPC contract

**Files:**
- Modify: `electron/preload.ts`
- Rewrite: `electron/ipc/partnerScout.ts`

- [ ] **Step 1: Ler `electron/preload.ts` atual e identificar onde plugar novos handlers**

```bash
cat electron/preload.ts | head -100
```

- [ ] **Step 2: Reescrever `electron/ipc/partnerScout.ts`**

Caminho: `electron/ipc/partnerScout.ts`

```typescript
import { ipcMain, app, BrowserWindow } from 'electron'

import { resolveGeminiApiKey } from '../services/gemini-key-resolver.js'
import { createBrandCache } from '../services/brand-cache.js'
import { createRunHistory } from '../services/run-history.js'
import { runProspection, GEMINI_MODEL_FALLBACK_CHAIN } from '../services/partner-scout-agent.js'

import type {
  BrandCacheEntry,
  BrandStatus,
} from '../../src/modules/partner-scout-v2/data/brand-cache.types.js'
import type { ContatoMarca } from '../../src/modules/partner-scout-v2/agent/schema.js'
import { ROBERTO_CARECA_PROFILE } from '../../src/modules/partner-scout-v2/data/creator-profile.js'

const brandCache = createBrandCache({})
const runHistory = createRunHistory({})

let activeRunController: AbortController | null = null
let activeRunId: string | null = null

function broadcast(channel: string, payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerPartnerScoutHandlers() {
  ipcMain.handle('partnerScout:getApiKeyStatus', () => {
    const r = resolveGeminiApiKey()
    return {
      configured: r.key.length > 0,
      source: r.source,
      masked: r.masked,
    }
  })

  ipcMain.handle('partnerScout:getCreatorProfile', () => ROBERTO_CARECA_PROFILE)

  ipcMain.handle('partnerScout:run', async () => {
    if (activeRunController) {
      throw new Error('RUN_ALREADY_IN_PROGRESS')
    }

    const { key } = resolveGeminiApiKey()
    if (!key) {
      throw new Error('GEMINI_API_KEY_MISSING')
    }

    const cacheHints = brandCache.getActiveSkipList(90)
    const controller = new AbortController()
    activeRunController = controller

    const promise = runProspection({
      apiKey: key,
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints,
      modelChain: GEMINI_MODEL_FALLBACK_CHAIN,
      signal: controller.signal,
      onProgress: (event) => broadcast('partnerScout:progress', event),
    })

    promise
      .then(({ run, result }) => {
        runHistory.append(run)
        if (result) {
          for (const marca of result.resultado_final) {
            brandCache.upsertFromRun(marca)
          }
        }
        broadcast('partnerScout:done', run)
      })
      .catch((error: Error) => {
        broadcast('partnerScout:error', { runId: activeRunId, error: error.message })
      })
      .finally(() => {
        activeRunController = null
        activeRunId = null
      })

    activeRunId = `pending-${Date.now()}`  // será sobrescrito pelo runId real no done
    return { runId: activeRunId }
  })

  ipcMain.handle('partnerScout:abort', () => {
    if (!activeRunController) return { ok: false }
    activeRunController.abort(new Error('user-aborted'))
    return { ok: true }
  })

  ipcMain.handle('partnerScout:listRuns', () => runHistory.list())
  ipcMain.handle('partnerScout:getRun', (_, id: string) => runHistory.get(id))
  ipcMain.handle('partnerScout:deleteRun', (_, id: string) => {
    runHistory.delete(id)
    return { ok: true }
  })

  ipcMain.handle('partnerScout:listCache', () => brandCache.list())

  ipcMain.handle('partnerScout:setBrandStatus', (_, payload: { nomeNormalizado: string; status: BrandStatus; nota?: string }) => {
    return brandCache.setStatus(payload.nomeNormalizado, payload.status, payload.nota)
  })

  ipcMain.handle('partnerScout:updateBrandContact', (_, payload: { nomeNormalizado: string; patch: Partial<ContatoMarca> }) => {
    return brandCache.updateContact(payload.nomeNormalizado, payload.patch)
  })

  ipcMain.handle('partnerScout:addBrandNote', (_, payload: { nomeNormalizado: string; text: string }) => {
    return brandCache.addNote(payload.nomeNormalizado, payload.text)
  })
}
```

Nota: este código removeu o `partnerScout:fetchOfficialYoutubeSignals` antigo — vai quebrar a UI da v1 que ainda depende dele. **Isso é intencional**: a UI v1 vai ser substituída na Task 9, e durante a janela em que ela ainda existe, o handler antigo está quebrado. Pra evitar isso, mantenha o handler antigo até o swap final. Versão alternativa:

Adicionar ANTES do `registerPartnerScoutHandlers` novo, dentro do mesmo arquivo, manter o código antigo do handler `partnerScout:fetchOfficialYoutubeSignals` (copiar do que existia). Isso mantém a v1 funcional. Vai ser deletado na Task 10.

- [ ] **Step 3: Atualizar `electron/preload.ts` adicionando a nova interface (sem remover a antiga)**

Ler o arquivo atual primeiro:

```bash
cat electron/preload.ts
```

Adicionar dentro do `careca` exposto (sem remover `fetchOfficialYoutubeSignals`):

```typescript
partnerScout: {
  // ... fetchOfficialYoutubeSignals: existing handler stays for backward compat ...
  run: () => ipcRenderer.invoke('partnerScout:run'),
  abort: () => ipcRenderer.invoke('partnerScout:abort'),
  onProgress: (cb) => {
    const handler = (_e, p) => cb(p)
    ipcRenderer.on('partnerScout:progress', handler)
    return () => ipcRenderer.off('partnerScout:progress', handler)
  },
  onDone: (cb) => {
    const handler = (_e, p) => cb(p)
    ipcRenderer.on('partnerScout:done', handler)
    return () => ipcRenderer.off('partnerScout:done', handler)
  },
  onError: (cb) => {
    const handler = (_e, p) => cb(p)
    ipcRenderer.on('partnerScout:error', handler)
    return () => ipcRenderer.off('partnerScout:error', handler)
  },
  listRuns: () => ipcRenderer.invoke('partnerScout:listRuns'),
  getRun: (id) => ipcRenderer.invoke('partnerScout:getRun', id),
  deleteRun: (id) => ipcRenderer.invoke('partnerScout:deleteRun', id),
  listCache: () => ipcRenderer.invoke('partnerScout:listCache'),
  setBrandStatus: (nomeNormalizado, status, nota) =>
    ipcRenderer.invoke('partnerScout:setBrandStatus', { nomeNormalizado, status, nota }),
  updateBrandContact: (nomeNormalizado, patch) =>
    ipcRenderer.invoke('partnerScout:updateBrandContact', { nomeNormalizado, patch }),
  addBrandNote: (nomeNormalizado, text) =>
    ipcRenderer.invoke('partnerScout:addBrandNote', { nomeNormalizado, text }),
  getApiKeyStatus: () => ipcRenderer.invoke('partnerScout:getApiKeyStatus'),
  getCreatorProfile: () => ipcRenderer.invoke('partnerScout:getCreatorProfile'),
},
```

Atualizar também a tipagem global (provavelmente em `src/types/` ou no próprio `preload.ts`).

- [ ] **Step 4: Build do main process**

```bash
npm run electron:build
```

Expected: zero erros TS no main.

- [ ] **Step 5: Smoke test manual via DevTools console**

```bash
npm run electron:dev
```

No DevTools do app, executar:

```javascript
await window.careca.partnerScout.getApiKeyStatus()
```

Expected: `{ configured: true, source: '...', masked: 'AIza...xyz' }`.

```javascript
await window.careca.partnerScout.listCache()
```

Expected: `[]` (cache vazio na primeira execução).

- [ ] **Step 6: Commit**

```bash
git add electron/ipc/partnerScout.ts electron/preload.ts
git commit -m "feat(partner-scout-v2): IPC handlers (mantém legacy ate o swap)"
```

---

## Task 9: Zustand store + UI components (stub data primeiro)

**Files:**
- Create: `src/modules/partner-scout-v2/data/prospection-run.store.ts`
- Create: `src/modules/partner-scout-v2/components/ScoutDashboard.tsx`
- Create: `src/modules/partner-scout-v2/components/LeadCard.tsx`
- Create: `src/modules/partner-scout-v2/components/LeadDetail.tsx`
- Create: `src/modules/partner-scout-v2/components/SourcesConfig.tsx`
- Create: `src/modules/partner-scout-v2/index.tsx`

### 9.1 — Zustand store

- [ ] **Step 1: Criar `prospection-run.store.ts`**

Caminho: `src/modules/partner-scout-v2/data/prospection-run.store.ts`

```typescript
import { create } from 'zustand'

import type { ProspectionRun, RunProgressEvent } from '../agent/run.js'
import type { BrandCacheEntry } from './brand-cache.types.js'

export type ScoutTab = 'top' | 'history' | 'cache'

interface PartnerScoutV2State {
  status: 'idle' | 'running' | 'done' | 'error'
  currentRunId: string | null
  currentRun: ProspectionRun | null
  runs: ProspectionRun[]
  cache: BrandCacheEntry[]
  progressLog: RunProgressEvent[]
  tab: ScoutTab
  selectedBrand: string | null
  setTab: (tab: ScoutTab) => void
  selectBrand: (n: string | null) => void
  setStatus: (s: PartnerScoutV2State['status']) => void
  pushProgress: (e: RunProgressEvent) => void
  setCurrentRun: (r: ProspectionRun) => void
  setRuns: (rs: ProspectionRun[]) => void
  setCache: (c: BrandCacheEntry[]) => void
  resetProgress: () => void
}

export const usePartnerScoutV2Store = create<PartnerScoutV2State>((set) => ({
  status: 'idle',
  currentRunId: null,
  currentRun: null,
  runs: [],
  cache: [],
  progressLog: [],
  tab: 'top',
  selectedBrand: null,
  setTab: (tab) => set({ tab }),
  selectBrand: (n) => set({ selectedBrand: n }),
  setStatus: (status) => set({ status }),
  pushProgress: (e) =>
    set((s) => ({ progressLog: [...s.progressLog.slice(-199), e] })),
  setCurrentRun: (r) => set({ currentRun: r, currentRunId: r.id }),
  setRuns: (runs) => set({ runs }),
  setCache: (cache) => set({ cache }),
  resetProgress: () => set({ progressLog: [] }),
}))
```

### 9.2 — Componentes (stubs com markup completo)

- [ ] **Step 2: Criar `LeadCard.tsx`**

Caminho: `src/modules/partner-scout-v2/components/LeadCard.tsx`

```typescript
import type { MarcaProspectada } from '../agent/schema.js'

interface LeadCardProps {
  marca: MarcaProspectada
  onOpenDetail: () => void
  onMarkContact: () => void
  selected?: boolean
}

const fitTone = (score: number) =>
  score >= 9 ? 'text-green-400' : score >= 7 ? 'text-yellow-400' : 'text-zinc-400'

const fonteEmailIcon = (fonte: string) => {
  if (fonte === 'nao_localizado') return '✗'
  if (fonte.startsWith('inferido')) return 'ⓘ'
  return '✓'
}

export function LeadCard({ marca, onOpenDetail, onMarkContact, selected }: LeadCardProps) {
  const tier = marca.ticket_estimado_brl
  const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n)
  const truncate = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n) + '…')

  return (
    <div
      className={
        'rounded-[10px] border bg-[#131316] p-4 ' +
        (selected ? 'border-violet-500/40' : 'border-white/[0.06]')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base text-white">{marca.marca}</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            {marca.categoria} · {marca.porte} · BR {marca.operacao_brasil}
          </p>
        </div>
        <div className={`font-mono text-sm ${fitTone(marca.fit_demografico.score)}`}>
          Fit {marca.fit_demografico.score}/10
        </div>
      </div>

      <div className="mt-3 inline-block rounded-md bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">
        {marca.tipo_publi_recomendado}
      </div>

      <div className="mt-2 font-mono text-xs text-zinc-300">
        R$ {fmt(tier.minimo)} – {fmt(tier.ideal)} – {fmt(tier.premium)}
      </div>

      {marca.lancamentos_proximos.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {marca.lancamentos_proximos.slice(0, 2).map((l) => (
            <span key={l.titulo} className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
              {l.tipo === 'jogo' ? '🎮' : l.tipo === 'produto' ? '📦' : l.tipo === 'evento' ? '🎫' : '📺'} {l.titulo} · {l.data_prevista}
            </span>
          ))}
          {marca.lancamentos_proximos.length > 2 && (
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
              +{marca.lancamentos_proximos.length - 2} mais
            </span>
          )}
        </div>
      )}

      <p className="mt-2 text-sm leading-snug text-zinc-300">
        {truncate(marca.fit_demografico.justificativa, 140)}
      </p>

      {marca.alertas.length > 0 && (
        <div className="mt-2 inline-block rounded-md bg-yellow-500/15 px-2 py-0.5 text-xs text-yellow-300">
          ⚠ {marca.alertas.length} alerta{marca.alertas.length > 1 ? 's' : ''}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
        <span>{fonteEmailIcon(marca.contato.fonte_email)}</span>
        <span className="font-mono">{marca.contato.email_primario ?? '—'}</span>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onOpenDetail}
          className="rounded-md bg-white/5 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
        >
          Ver detalhe
        </button>
        <button
          type="button"
          onClick={onMarkContact}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
        >
          Marcar a contatar
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar `LeadDetail.tsx`**

Caminho: `src/modules/partner-scout-v2/components/LeadDetail.tsx`

```typescript
import { useState } from 'react'

import type { MarcaProspectada, ContatoMarca } from '../agent/schema.js'
import type { BrandStatus } from '../data/brand-cache.types.js'

interface LeadDetailProps {
  marca: MarcaProspectada | null
  onClose: () => void
  onSaveContact: (patch: Partial<ContatoMarca>) => void
  onSetStatus: (status: BrandStatus, nota?: string) => void
}

const STATUSES: BrandStatus[] = [
  'descoberta',
  'a_contatar',
  'contatada',
  'em_negociacao',
  'convertida',
  'sem_retorno',
  'rejeitada',
  'pular',
]

export function LeadDetail({ marca, onClose, onSaveContact, onSetStatus }: LeadDetailProps) {
  const [emailPrimario, setEmailPrimario] = useState(marca?.contato.email_primario ?? '')
  const [emailAlt, setEmailAlt] = useState(marca?.contato.email_alternativo ?? '')
  const [agencia, setAgencia] = useState(marca?.contato.agencia_representante ?? '')
  const [novaNota, setNovaNota] = useState('')

  if (!marca) return null

  const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n)

  return (
    <aside className="fixed right-0 top-0 z-30 h-full w-[480px] overflow-y-auto border-l border-white/10 bg-[#0e0e10] p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl text-white">{marca.marca}</h2>
          <a href={marca.site} target="_blank" rel="noreferrer" className="text-xs text-violet-300 underline">
            {marca.site}
          </a>
          <p className="mt-1 text-xs text-zinc-400">
            {marca.categoria} · {marca.porte} · BR {marca.operacao_brasil}
          </p>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white" aria-label="Fechar">
          ✕
        </button>
      </div>

      <section className="mt-6">
        <p className="text-3xl font-mono text-white">{marca.fit_demografico.score}/10</p>
        <p className="mt-1 text-sm text-zinc-300">{marca.fit_demografico.justificativa}</p>
      </section>

      <section className="mt-6 rounded-[10px] border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Pitch sugerido</p>
          <button
            onClick={() => navigator.clipboard.writeText(marca.argumento_pitch)}
            className="text-xs text-violet-300 hover:underline"
          >
            Copiar
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-200 whitespace-pre-line">{marca.argumento_pitch}</p>
      </section>

      <section className="mt-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Ticket estimado (BRL)</p>
        <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-sm">
          <div>
            <p className="text-zinc-500">mín</p>
            <p className="text-white">R$ {fmt(marca.ticket_estimado_brl.minimo)}</p>
          </div>
          <div>
            <p className="text-zinc-500">ideal</p>
            <p className="text-white">R$ {fmt(marca.ticket_estimado_brl.ideal)}</p>
          </div>
          <div>
            <p className="text-zinc-500">premium</p>
            <p className="text-white">R$ {fmt(marca.ticket_estimado_brl.premium)}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500 font-mono">{marca.ticket_estimado_brl.base_calculo}</p>
      </section>

      <section className="mt-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Lançamentos próximos</p>
        {marca.lancamentos_proximos.length === 0 ? (
          <p className="mt-2 text-xs text-zinc-500">Sem lançamentos confirmados nos próximos 6 meses.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-zinc-200">
            {marca.lancamentos_proximos.map((l) => (
              <li key={l.titulo} className="flex items-center gap-2">
                <span>{l.tipo === 'jogo' ? '🎮' : l.tipo === 'produto' ? '📦' : l.tipo === 'evento' ? '🎫' : '📺'}</span>
                <span className="font-medium">{l.titulo}</span>
                <span className="font-mono text-xs text-zinc-400">· {l.data_prevista}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Contato (editável)</p>
        <label className="mt-2 block text-xs text-zinc-300">
          Email primário
          <input
            type="email"
            value={emailPrimario}
            onChange={(e) => setEmailPrimario(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-sm text-white"
          />
        </label>
        <label className="mt-2 block text-xs text-zinc-300">
          Email alternativo
          <input
            type="email"
            value={emailAlt}
            onChange={(e) => setEmailAlt(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-sm text-white"
          />
        </label>
        <label className="mt-2 block text-xs text-zinc-300">
          Agência
          <input
            type="text"
            value={agencia}
            onChange={(e) => setAgencia(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-sm text-white"
          />
        </label>
        <button
          onClick={() => onSaveContact({
            email_primario: emailPrimario || null,
            email_alternativo: emailAlt || null,
            agencia_representante: agencia || null,
          })}
          className="mt-2 rounded-md bg-violet-600 px-3 py-1.5 text-xs text-white hover:bg-violet-500"
        >
          Salvar contato
        </button>
        <p className="mt-2 text-xs text-zinc-500">Fonte original: {marca.contato.fonte_email}</p>
        {marca.contato.formulario_parcerias && (
          <a
            href={marca.contato.formulario_parcerias}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block text-xs text-violet-300 underline"
          >
            Formulário de parcerias →
          </a>
        )}
      </section>

      {marca.campanhas_recentes_creator.length > 0 && (
        <section className="mt-6">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Campanhas recentes</p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-300">
            {marca.campanhas_recentes_creator.map((c, i) => (
              <li key={i}>
                <a href={c.link} target="_blank" rel="noreferrer" className="text-violet-300 underline">
                  {c.creator}
                </a>{' '}
                · {c.data}
              </li>
            ))}
          </ul>
        </section>
      )}

      {marca.alertas.length > 0 && (
        <section className="mt-6">
          <p className="text-xs uppercase tracking-wide text-yellow-400">Alertas</p>
          <ul className="mt-2 list-disc pl-5 text-xs text-zinc-300">
            {marca.alertas.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <p className="text-xs uppercase tracking-wide text-zinc-400">Status</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onSetStatus(s, novaNota || undefined)}
              className="rounded-md border border-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-violet-500/20"
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          value={novaNota}
          onChange={(e) => setNovaNota(e.target.value)}
          placeholder="Adicionar nota junto com a mudança de status (opcional)"
          className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
          rows={2}
        />
      </section>
    </aside>
  )
}
```

- [ ] **Step 4: Criar `ScoutDashboard.tsx`**

Caminho: `src/modules/partner-scout-v2/components/ScoutDashboard.tsx`

```typescript
import type { MarcaProspectada } from '../agent/schema.js'
import type { ProspectionRun, RunProgressEvent } from '../agent/run.js'
import type { BrandCacheEntry } from '../data/brand-cache.types.js'
import { LeadCard } from './LeadCard.js'

interface ScoutDashboardProps {
  status: 'idle' | 'running' | 'done' | 'error'
  currentRun: ProspectionRun | null
  runs: ProspectionRun[]
  cache: BrandCacheEntry[]
  progressLog: RunProgressEvent[]
  tab: 'top' | 'history' | 'cache'
  onTab: (t: 'top' | 'history' | 'cache') => void
  onRun: () => void
  onAbort: () => void
  onSelectMarca: (m: MarcaProspectada) => void
  onMarkContact: (m: MarcaProspectada) => void
  onOpenSettings: () => void
}

export function ScoutDashboard(props: ScoutDashboardProps) {
  const { status, currentRun, runs, cache, progressLog, tab } = props

  const groupByCategoria = (marcas: MarcaProspectada[]) => {
    const groups: Record<string, MarcaProspectada[]> = {}
    for (const m of marcas) {
      groups[m.categoria] ??= []
      groups[m.categoria]!.push(m)
    }
    return groups
  }

  const top10 = currentRun?.result
    ? currentRun.result.resultado_final.filter((m) =>
        currentRun.result!.top_10_destaque.includes(m.marca),
      )
    : []
  const cardsToShow = tab === 'top' ? (top10.length > 0 ? top10 : currentRun?.result?.resultado_final ?? []) : []
  const groups = groupByCategoria(cardsToShow)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-white">Partner Scout</h1>
          {currentRun && (
            <p className="mt-1 font-mono text-xs text-zinc-400">
              Última run: {new Date(currentRun.startedAt).toLocaleString('pt-BR')} ·
              {' '}{currentRun.result?.resultado_final.length ?? 0} marcas ·
              {' '}US$ {currentRun.usage.custo_estimado_usd.toFixed(3)} ·
              {' '}{currentRun.usage.modelo_efetivo}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={props.onOpenSettings} className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5">
            Configurações
          </button>
          {status === 'running' ? (
            <button onClick={props.onAbort} className="rounded-md bg-red-500/80 px-4 py-2 text-sm text-white hover:bg-red-500">
              Cancelar run
            </button>
          ) : (
            <button onClick={props.onRun} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500">
              ▶ Nova varredura
            </button>
          )}
        </div>
      </header>

      <nav className="flex gap-1 border-b border-white/10">
        {(['top', 'history', 'cache'] as const).map((t) => (
          <button
            key={t}
            onClick={() => props.onTab(t)}
            className={
              'px-4 py-2 text-sm ' +
              (tab === t ? 'border-b-2 border-violet-500 text-white' : 'text-zinc-400 hover:text-white')
            }
          >
            {t === 'top' ? 'Top 10 do último run' : t === 'history' ? `Histórico (${runs.length})` : `Cache (${cache.length})`}
          </button>
        ))}
      </nav>

      {status === 'running' && (
        <section className="rounded-[10px] border border-white/10 bg-black/30 p-4">
          <p className="font-mono text-xs text-zinc-400">Log do agente (ao vivo)</p>
          <div className="mt-2 max-h-64 overflow-y-auto font-mono text-xs text-zinc-300">
            {progressLog.map((e, i) => (
              <p key={i} className="leading-snug">[{e.kind}] {e.detail}</p>
            ))}
          </div>
        </section>
      )}

      {tab === 'top' && cardsToShow.length === 0 && status === 'idle' && (
        <p className="text-center text-sm text-zinc-500">Nenhum run ainda. Clique em "Nova varredura" pra começar.</p>
      )}

      {tab === 'top' && Object.entries(groups).map(([cat, marcas]) => (
        <section key={cat}>
          <h3 className="mb-3 text-xs uppercase tracking-wide text-zinc-400">{cat} ({marcas.length})</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {marcas.map((m) => (
              <LeadCard
                key={m.marca}
                marca={m}
                onOpenDetail={() => props.onSelectMarca(m)}
                onMarkContact={() => props.onMarkContact(m)}
              />
            ))}
          </div>
        </section>
      ))}

      {tab === 'history' && (
        <ul className="space-y-2 font-mono text-sm text-zinc-300">
          {runs.map((r) => (
            <li key={r.id} className="rounded-md border border-white/10 bg-white/[0.02] p-3">
              <p>{new Date(r.startedAt).toLocaleString('pt-BR')} · {r.status} · {r.result?.resultado_final.length ?? 0} marcas · US$ {r.usage.custo_estimado_usd.toFixed(3)}</p>
            </li>
          ))}
        </ul>
      )}

      {tab === 'cache' && (
        <ul className="space-y-2 font-mono text-sm text-zinc-300">
          {cache.map((c) => (
            <li key={c.nome_normalizado} className="rounded-md border border-white/10 bg-white/[0.02] p-3 flex justify-between">
              <span>{c.nome_display}</span>
              <span className="text-zinc-500">{c.status} · {c.ultima_descoberta.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Criar `SourcesConfig.tsx`**

Caminho: `src/modules/partner-scout-v2/components/SourcesConfig.tsx`

```typescript
import { useEffect, useState } from 'react'

interface SourcesConfigProps {
  onBack: () => void
}

export function SourcesConfig({ onBack }: SourcesConfigProps) {
  const [apiStatus, setApiStatus] = useState<{ configured: boolean; source: string; masked?: string } | null>(null)

  useEffect(() => {
    void window.careca.partnerScout.getApiKeyStatus().then(setApiStatus)
  }, [])

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="text-zinc-400 hover:text-white">← Voltar</button>
        <h1 className="font-display text-2xl text-white">Configurações</h1>
      </header>

      <section className="rounded-[10px] border border-white/10 bg-[#131316] p-4">
        <h2 className="font-display text-base text-white">Gemini API</h2>
        {apiStatus === null ? (
          <p className="mt-2 text-sm text-zinc-400">Carregando…</p>
        ) : apiStatus.configured ? (
          <>
            <p className="mt-2 text-sm text-green-400">✓ Configurada</p>
            <p className="mt-1 font-mono text-xs text-zinc-300">{apiStatus.masked}</p>
            <p className="mt-1 font-mono text-xs text-zinc-500">fonte: {apiStatus.source}</p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-red-400">✗ Não configurada</p>
            <p className="mt-2 text-xs text-zinc-300">
              Configure em uma das 3 fontes (na ordem que será verificada):
            </p>
            <ol className="mt-1 list-decimal pl-5 text-xs text-zinc-400 space-y-1">
              <li>variável de ambiente <code className="font-mono">GEMINI_API_KEY</code></li>
              <li>arquivo <code className="font-mono">D:\Projetos\Clip-Splitter\.env</code> (linha <code>GEMINI_API_KEY=...</code>)</li>
              <li>variável de ambiente do usuário Windows (HKCU\Environment\GEMINI_API_KEY)</li>
            </ol>
            <p className="mt-2 text-xs text-zinc-500">Reinicie o app após configurar.</p>
          </>
        )}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs text-violet-300 underline"
        >
          Obter chave Gemini →
        </a>
      </section>

      <section className="rounded-[10px] border border-white/10 bg-[#131316] p-4">
        <h2 className="font-display text-base text-white">Perfil do criador</h2>
        <p className="mt-2 text-xs text-zinc-400">
          Read-only no v1. Pra atualizar, edite{' '}
          <code className="font-mono text-violet-300">src/modules/partner-scout/data/creator-profile.ts</code>{' '}
          e recompile o app.
        </p>
      </section>

      <section className="rounded-[10px] border border-white/10 bg-[#131316] p-4">
        <h2 className="font-display text-base text-white">Cache de marcas</h2>
        <p className="mt-2 text-xs text-zinc-400">Janela de skip: 90 dias (hard-coded no v1).</p>
      </section>
    </div>
  )
}
```

- [ ] **Step 6: Criar `index.tsx` (entrypoint do módulo v2)**

Caminho: `src/modules/partner-scout-v2/index.tsx`

```typescript
import { useEffect, useState } from 'react'

import { ScoutDashboard } from './components/ScoutDashboard.js'
import { LeadDetail } from './components/LeadDetail.js'
import { SourcesConfig } from './components/SourcesConfig.js'
import { usePartnerScoutV2Store } from './data/prospection-run.store.js'
import type { MarcaProspectada } from './agent/schema.js'
import type { BrandStatus } from './data/brand-cache.types.js'
import { normalizeBrandName } from './utils/normalize-brand-name.js'

type Screen = 'dashboard' | 'settings'

export function PartnerScoutModuleV2() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [openMarca, setOpenMarca] = useState<MarcaProspectada | null>(null)

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

    const offProgress = window.careca.partnerScout.onProgress(pushProgress)
    const offDone = window.careca.partnerScout.onDone((run) => {
      setCurrentRun(run)
      setStatus('done')
      void window.careca.partnerScout.listRuns().then(setRuns)
      void window.careca.partnerScout.listCache().then(setCache)
    })
    const offError = window.careca.partnerScout.onError(() => setStatus('error'))

    return () => {
      offProgress()
      offDone()
      offError()
    }
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
      />
    </div>
  )
}
```

### 9.3 — Tipos globais do preload

- [ ] **Step 7: Adicionar tipagem `window.careca.partnerScout` em `src/types/`**

Verificar se já existe um arquivo `src/types/global.d.ts` ou similar:

```bash
ls src/types/ 2>&1
```

Se existe, adicionar a interface lá. Se não, criar `src/types/partner-scout-v2.d.ts`:

```typescript
import type { BrandCacheEntry, BrandStatus } from '../modules/partner-scout-v2/data/brand-cache.types'
import type { ContatoMarca } from '../modules/partner-scout-v2/agent/schema'
import type { ProspectionRun, RunProgressEvent } from '../modules/partner-scout-v2/agent/run'

declare global {
  interface Window {
    careca: {
      partnerScout: {
        run: () => Promise<{ runId: string }>
        abort: () => Promise<{ ok: boolean }>
        onProgress: (cb: (e: RunProgressEvent) => void) => () => void
        onDone: (cb: (run: ProspectionRun) => void) => () => void
        onError: (cb: (p: { runId: string; error: string }) => void) => () => void
        listRuns: () => Promise<ProspectionRun[]>
        getRun: (id: string) => Promise<ProspectionRun | null>
        deleteRun: (id: string) => Promise<{ ok: boolean }>
        listCache: () => Promise<BrandCacheEntry[]>
        setBrandStatus: (n: string, s: BrandStatus, nota?: string) => Promise<BrandCacheEntry>
        updateBrandContact: (n: string, patch: Partial<ContatoMarca>) => Promise<BrandCacheEntry>
        addBrandNote: (n: string, text: string) => Promise<BrandCacheEntry>
        getApiKeyStatus: () => Promise<{ configured: boolean; source: string; masked?: string }>
        getCreatorProfile: () => Promise<unknown>
        // legacy v1 (a remover na Task 10):
        fetchOfficialYoutubeSignals: () => Promise<unknown[]>
      }
      // outras ferramentas (subtitle, clipSplitter, pptx) — manter as existentes
    }
  }
}

export {}
```

- [ ] **Step 8: Verificar tsc e build**

```bash
npx tsc --noEmit
npm run electron:build
```

Expected: zero erros.

- [ ] **Step 9: Smoke manual no Electron**

Pra testar v2 sem swap, criar uma rota temporária. Editar `src/App.tsx` (ou onde a rota da v1 é renderizada) adicionando uma flag temporária:

```typescript
import { PartnerScoutModuleV2 } from '@/modules/partner-scout-v2'
// ... onde renderiza PartnerScoutModule:
const SHOW_V2 = true  // TEMPORÁRIO — remover na Task 10
return SHOW_V2 ? <PartnerScoutModuleV2 /> : <PartnerScoutModule />
```

Rodar:

```bash
npm run electron:dev
```

Expected: app abre, navega pra Partner Scout, vê dashboard com botão "Nova varredura" e tabs.

- [ ] **Step 10: Smoke run real (≥25 marcas, custo, log)**

No app rodando, clicar "Nova varredura". Aguardar 2-5 minutos. Validar:
- [ ] Log mostra `🔍 google_search:` durante a run
- [ ] Status muda pra "done"
- [ ] Cards aparecem agrupados por categoria
- [ ] Custo aparece no header (US$ x.xxx)
- [ ] Modelo efetivo aparece (gemini-2.5-flash ou fallback)
- [ ] Pelo menos uma marca tem `email_primario` preenchido

Se aparecer < 10 marcas ou tudo "nao_localizado", capturar logs e investigar antes de seguir.

- [ ] **Step 11: Commit**

```bash
git add src/modules/partner-scout-v2 src/types
git commit -m "feat(partner-scout-v2): UI components, store e entrypoint completos"
```

---

## Task 10: Swap atômico + cleanup + README

**Files:**
- Delete: `src/modules/partner-scout/` inteiro
- Move: `src/modules/partner-scout-v2/` → `src/modules/partner-scout/`
- Modify: `electron/ipc/partnerScout.ts` (remover handler legacy `fetchOfficialYoutubeSignals`)
- Modify: `electron/preload.ts` (remover `fetchOfficialYoutubeSignals`)
- Modify: `src/App.tsx` (remover flag `SHOW_V2`, renomear import)
- Move: `02-partner-scout.md` → `docs/legacy/02-partner-scout-v1.md`
- Modify: `README.md`
- Modify: `C:\Users\João\.claude\skills\careca-studio\SKILL.md`

- [ ] **Step 1: Mover prompt original v0 pra legacy**

```bash
mkdir -p docs/legacy
mv 02-partner-scout.md docs/legacy/02-partner-scout-v1.md
```

(O `01-media-kit-editor.md` fica onde está — não é parte desta migração.)

- [ ] **Step 2: Apagar src/modules/partner-scout antigo**

```bash
rm -rf src/modules/partner-scout
```

- [ ] **Step 3: Renomear partner-scout-v2 pra partner-scout**

```bash
mv src/modules/partner-scout-v2 src/modules/partner-scout
```

- [ ] **Step 4: Buscar e ajustar todos imports `partner-scout-v2` → `partner-scout`**

```bash
grep -rln "partner-scout-v2" src/ electron/ scripts/ 2>/dev/null
```

Para cada arquivo retornado, fazer find-replace `partner-scout-v2` → `partner-scout`. Caminhos esperados:
- `src/App.tsx`
- `src/types/partner-scout-v2.d.ts` (renomear arquivo também: `mv src/types/partner-scout-v2.d.ts src/types/partner-scout.d.ts` e atualizar imports internos)
- `electron/ipc/partnerScout.ts`
- `electron/services/brand-cache.ts`
- `electron/services/brand-cache.test.ts`
- `electron/services/run-history.ts`
- `electron/services/run-history.test.ts`
- `electron/services/partner-scout-agent.ts`
- `electron/services/partner-scout-agent.test.ts`
- `scripts/test-partner-scout-real.ts`

Use `sed` ou edite manualmente. Exemplo com sed (Linux/Mac/Git Bash):

```bash
grep -rln "partner-scout-v2" src/ electron/ scripts/ | xargs sed -i 's/partner-scout-v2/partner-scout/g'
```

(No Windows nativo bash, `sed -i` funciona. Validar.)

- [ ] **Step 5: Renomear `PartnerScoutModuleV2` pra `PartnerScoutModule`**

Em `src/modules/partner-scout/index.tsx`, renomear a função exportada de `PartnerScoutModuleV2` pra `PartnerScoutModule`. Atualizar o import em `src/App.tsx` e remover a flag `SHOW_V2` (deixar só `<PartnerScoutModule />`).

- [ ] **Step 6: Remover handler legacy `fetchOfficialYoutubeSignals`**

Em `electron/ipc/partnerScout.ts`, remover qualquer código relacionado a `partnerScout:fetchOfficialYoutubeSignals`, `BrandYoutubeSource`, `OfficialYoutubeSignal`, `escapeXml`, `resolveYoutubeChannelId`, `parseFeedEntries`, `isRelevantVideo`, `fetchOfficialYoutubeSignalsForSource`. Sobra apenas o que foi escrito na Task 8.

- [ ] **Step 7: Remover `fetchOfficialYoutubeSignals` do preload e dos tipos**

Em `electron/preload.ts`: remover linha `fetchOfficialYoutubeSignals: () => ipcRenderer.invoke('partnerScout:fetchOfficialYoutubeSignals')`.

Em `src/types/partner-scout.d.ts`: remover linha `fetchOfficialYoutubeSignals: () => Promise<unknown[]>`.

- [ ] **Step 8: Verificar tsc e build**

```bash
npx tsc --noEmit
npm run electron:build
```

Expected: zero erros TS, zero referências quebradas.

- [ ] **Step 9: Rodar todos os testes**

```bash
npx vitest run
```

Expected: todos passam (key resolver, normalize-brand-name, brand-cache, run-history, agent, schema, system-prompt).

- [ ] **Step 10: Smoke end-to-end final**

```bash
npm run electron:dev
```

Validar:
- [ ] App abre sem erros no console
- [ ] Navega pra Partner Scout sem flag temporária
- [ ] "Configurações" mostra status da chave
- [ ] "Nova varredura" funciona ponta-a-ponta
- [ ] Resultado tem ≥25 marcas (run real, sem `maxToolCalls` reduzido)
- [ ] Marcar uma marca como `contatada` e rodar nova varredura → ela aparece no bloco de "MARCAS EM CACHE — PULAR" do prompt (verificar via DevTools que `getActiveSkipList` retorna ela)
- [ ] Editar email no `LeadDetail` e clicar "Salvar contato" persiste no cache

- [ ] **Step 11: Atualizar README.md**

Reescrever a seção "Partner Scout" do `README.md`. Ler o atual primeiro pra identificar o range de linhas:

```bash
grep -n "Partner Scout" README.md
```

Substituir a seção pela nova:

```markdown
## Partner Scout

Descobre marcas brasileiras com fit pro canal do Roberto Careca via agente
LLM Gemini com `google_search` (grounding) e `url_context` nativos.
Substitui o scraper de canais concorrentes da v1.

**Como funciona:**
- Roda sob demanda (botão "Nova varredura" no dashboard)
- Agente Gemini decide queries dinamicamente baseado no ano corrente,
  descobre 30+ marcas, filtra eliminatoriamente, enriquece (site,
  contato, ticket, fit demográfico, alertas) e ranqueia
- Mantém cache de marcas já prospectadas (90 dias por status) pra não repetir
- Resultado: mín. 25 marcas com pitch copy-pastable e caminho de contato

**Setup:**
1. Configure a chave Gemini em uma das 3 fontes (lidas nesta ordem):
   - variável de ambiente `GEMINI_API_KEY`
   - arquivo `D:\Projetos\Clip-Splitter\.env` (linha `GEMINI_API_KEY=...`)
   - variável de ambiente do usuário Windows (`HKCU\Environment\GEMINI_API_KEY`)
2. Reinicie o app — a chave é detectada automaticamente
3. Clique "Nova varredura" no dashboard

**Custos esperados:** ~US$ 1-3/mês com 2-4 runs/semana.

**Stack:** Electron main + Gemini REST API (gemini-2.5-flash com
fallback chain) + google_search + url_context + electron-store (cache) +
Vitest (testes unitários).
```

Atualizar também a seção "Estrutura" se ela mencionar a árvore antiga do `partner-scout/` (subpastas `scrapers/`, `scoring/`, `services/`).

- [ ] **Step 12: Atualizar a skill `careca-studio`**

Editar `C:\Users\João\.claude\skills\careca-studio\SKILL.md`. Buscar a seção que descreve "Partner Scout" / "Game Scout" / "React Scout" e atualizar a parte do Partner Scout pra refletir:
- É um agente LLM Gemini, não scraper
- Usa `google_search` e `url_context` nativos
- Chave reaproveitada do ClipSplitter
- Mín. 25 marcas por run com schema enriquecido

Se a skill referencia a tabela de fases/scoring antigo, remover.

- [ ] **Step 13: Commit final do swap**

```bash
git add -A
git commit -m "feat(partner-scout): swap atômico v1→v2, cleanup legados, README e skill atualizados"
```

- [ ] **Step 14: Validação final pós-swap**

```bash
npx vitest run
npm run electron:build
```

Expected: tudo passa.

```bash
ls src/modules/partner-scout/
```

Expected: estrutura nova (agent/, components/, data/, utils/, index.tsx). Sem `scrapers/`, sem `scoring/`, sem `services/pitch-generator.service.ts` etc.

```bash
ls docs/legacy/
```

Expected: `02-partner-scout-v1.md` presente.

```bash
git log --oneline | head -15
```

Expected: histórico mostra commits incrementais por task, terminando com o swap.

---

## Critérios de aceite globais (espelha Seção 12 do spec)

- [ ] App inicia e mostra status "Gemini configurada" se chave existe em alguma das 3 fontes
- [ ] App mostra status "Gemini não configurada" + instruções claras se as 3 fontes vazias
- [ ] Botão "Nova varredura" dispara o agente, mostra log em tempo real (cada `google_search` aparece)
- [ ] Run real produz `>= 25 marcas` no `resultado_final`
- [ ] Cada marca tem todos os campos do schema preenchidos (ou `null` explícito + `fonte_email: "nao_localizado"`)
- [ ] `executado_em` é a data real, `ano_referencia` é o ano corrente
- [ ] Marca prospectada e marcada como `contatada` aparece na lista PULAR da próxima run dentro de 90 dias
- [ ] User edita `email_primario` no `LeadDetail` e a edição persiste no cache
- [ ] Custo da run aparece após terminar + modelo efetivo
- [ ] Dashboard agrupa marcas por `categoria` com TOP 10 destacado
- [ ] Cancelar run no meio salva run parcial com status `aborted`
- [ ] Forçar 429 em `gemini-2.5-flash` → log mostra fallback e run continua (validar mockando ou observando em produção)
- [ ] README seção Partner Scout reflete a nova abordagem
- [ ] Skill `careca-studio` atualizada

---

## Plan complete

Spec: `docs/superpowers/specs/2026-04-25-partner-scout-v2-llm-agent-design.md`
Plan: `docs/superpowers/plans/2026-04-25-partner-scout-v2-llm-agent.md`
