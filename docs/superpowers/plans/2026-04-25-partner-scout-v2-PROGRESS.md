# Partner Scout v2 — Snapshot de Progresso

**Última atualização:** 2026-04-26
**Sessão:** pausada após Task 2 (checkpoint obrigatório do plano)

> Pra retomar em nova sessão: cole o **PROMPT DE RETOMADA** no fim deste arquivo.

---

## Status geral

| Task | O que faz | Status | Commit |
|---|---|---|---|
| 0 | git init + vitest setup | ✅ DONE | `aba5e3b chore: setup vitest for unit tests` |
| 1 | install electron-store + uuid | ✅ DONE | `6cf6f4c chore: install electron-store and uuid for Partner Scout v2` |
| 2 | schema + types (com `lancamentos_proximos`) | ✅ DONE | `a9fefb5 feat(partner-scout-v2): schema TS, gemini schema, types de cache e creator profile` |
| 3 | gemini key resolver (TDD) | ⏸ pendente | — |
| 4 | system prompt builder | ⏸ pendente | — |
| 5 | brand cache + normalize-brand-name | ⏸ pendente | — |
| 6 | run history | ⏸ pendente | — |
| 7 | agent runner Gemini REST | ⏸ pendente | — |
| 8 | IPC contract | ⏸ pendente | — |
| 9 | UI 4 componentes | ⏸ pendente | — |
| 10 | swap atômico + README + skill | ⏸ pendente | — |

**Git log atual:**
```
a9fefb5 feat(partner-scout-v2): schema TS, gemini schema, types de cache e creator profile
6cf6f4c chore: install electron-store and uuid for Partner Scout v2
aba5e3b chore: setup vitest for unit tests
f3d0dad chore: initial snapshot before Partner Scout v2 migration
```

**Branch:** `master`

---

## Decisões e desvios já incorporados

Durante a execução, alguns ajustes foram feitos vs o plano original:

1. **Vitest 3.2.4 em vez de 4.x** — Vitest 4 tem incompat com Vite 8 (TypeError em `describe()`). v3 estável foi instalado. Plano não pinava major, então OK.
2. **`vitest.config.ts` com `fileURLToPath(import.meta.url)`** — necessário porque o projeto é ESM (`"type": "module"`). Plano original usava `__dirname` direto (não funciona em ESM).
3. **`uuid@14.0.0`** instalado (latest) em vez de v9 — `randomUUID` continua funcionando.
4. **Campo novo `lancamentos_proximos`** — adicionado ao schema, gemini-schema, e regra hard no system prompt. Foi feedback do user incorporado em meio ao planejamento. Já está em [schema.ts](../../src/modules/partner-scout-v2/agent/schema.ts) e [gemini-schema.ts](../../src/modules/partner-scout-v2/agent/gemini-schema.ts).

---

## Caveats que valem pra TODAS as próximas tasks

1. **ESM + TypeScript:** imports usam `.js` mesmo em arquivos `.ts`. Ex: `import type { MarcaProspectada } from '../agent/schema.js'`. Esquecer disso → build quebra.
2. **`tmp-test/` foi commitado por engano no snapshot inicial** porque não está no `.gitignore`. Não é crítico, mas vale adicionar a `.gitignore` quando for natural.
3. **Aliases:** `@/` resolve pra `src/`. Configurado tanto no `tsconfig.json` quanto no `vitest.config.ts`.
4. **Shell:** bash. Use forward slashes. Comandos `git`, `npm`, `npx` funcionam normal.
5. **Working directory:** `d:\Projetos\careca-studio`.
6. **Chave Gemini:** vem de `process.env.GEMINI_API_KEY` ou do `.env` do Clip-Splitter ou do registro Windows. NÃO precisa input de UI. Detalhes na Task 3 do plano.
7. **Pricing Gemini hard-coded** em `partner-scout-agent.ts` (Task 7) é abr/2026 — confirmar antes do smoke real.
8. **`npm run build`** roda `tsc && vite build && tsc -p tsconfig.electron.json`. Se falhar, é bug real.
9. **Plan-deviations OK** se justificadas. Implementer relata `DONE_WITH_CONCERNS` quando precisa adaptar.

---

## Arquivos já existentes (criados no v2)

```
src/modules/partner-scout-v2/
├── agent/
│   ├── gemini-schema.test.ts    ✅ 4 testes passando
│   ├── gemini-schema.ts         ✅ com lancamentos_proximos
│   ├── run.ts                   ✅
│   └── schema.ts                ✅ com LancamentoProximo + TipoLancamento
└── data/
    ├── brand-cache.types.ts     ✅
    └── creator-profile.ts       ✅ Roberto Careca snapshot
```

---

## Memórias salvas (já existentes em `~/.claude/projects/.../memory/`)

1. `feedback_keep_readme_updated.md` — README sempre atualizado no mesmo passo
2. `feedback_partner_scout_lancamentos.md` — incluir nomes de jogos a serem lançados

---

## Documentos de referência

- **Spec:** [`docs/superpowers/specs/2026-04-25-partner-scout-v2-llm-agent-design.md`](../specs/2026-04-25-partner-scout-v2-llm-agent-design.md)
- **Plan:** [`docs/superpowers/plans/2026-04-25-partner-scout-v2-llm-agent.md`](2026-04-25-partner-scout-v2-llm-agent.md)
- **Skill careca-studio:** `C:\Users\João\.claude\skills\careca-studio\SKILL.md`

---

## Próxima task (Task 3) — gemini key resolver

**Arquivos a criar:**
- `electron/services/gemini-key-resolver.ts`
- `electron/services/gemini-key-resolver.test.ts`

**Replica:** `_carregar_gemini_api_key()` do `D:\Projetos\Clip-Splitter\clip_splitter.py:80-100`.

**TDD strict:** escrever 3 describe blocks (`normalizeApiKey`, `parseDotEnvForGeminiKey`, `resolveGeminiApiKey`) PRIMEIRO, ver falhar, depois implementar.

**Spec completa da task:** Task 3 do plan (Steps 1-6).

---

## PROMPT DE RETOMADA (cole isto numa nova sessão)

Estou retomando a execução do plano Partner Scout v2 do Careca Studio.

Working directory: `d:\Projetos\careca-studio`

Tasks 0, 1 e 2 já estão completas e commitadas. O snapshot de progresso completo está em [docs/superpowers/plans/2026-04-25-partner-scout-v2-PROGRESS.md](docs/superpowers/plans/2026-04-25-partner-scout-v2-PROGRESS.md) — leia primeiro pra ver o estado atual, decisões já tomadas e caveats que valem pra todas as próximas tasks.

A spec aprovada está em [docs/superpowers/specs/2026-04-25-partner-scout-v2-llm-agent-design.md](docs/superpowers/specs/2026-04-25-partner-scout-v2-llm-agent-design.md) e o plano detalhado em [docs/superpowers/plans/2026-04-25-partner-scout-v2-llm-agent.md](docs/superpowers/plans/2026-04-25-partner-scout-v2-llm-agent.md).

Continue a execução via subagent-driven-development a partir da **Task 3 (gemini key resolver, TDD)**. Antes de disparar o implementer, confirme rapidamente comigo se devo:
- A) Continuar disparando subagent por task com review inline (pra economizar contexto, dispatch reviewer só pras tasks 4, 7 e 9)
- B) Subagent + reviewer em todas as tasks (mais rigoroso, mais caro em contexto)
- C) Outra estratégia

Tasks restantes: 3, 4, 5, 6, 7, 8, 9, 10 (8 tasks).
