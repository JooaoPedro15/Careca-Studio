# Partner Scout

Snapshot temporario do modulo Partner Scout extraido do Careca Studio em 2026-05-21.

## O que e

O Partner Scout e um modulo de prospeccao comercial para criadores. Ele mapeia marcas com fit para o canal Roberto Careca, calcula encaixe comercial, estima ticket, sugere abordagem e gera relatorios Markdown.

O estado atual usa uma base local de marcas em `source/src/modules/partner-scout/data/partners.json` e enriquecimento opcional com Gemini quando `GEMINI_API_KEY` estiver configurada. Sem chave de IA, o modulo continua funcionando com os dados locais.

## Origem

Este codigo nasceu dentro do Careca Studio, um app desktop Electron + React + TypeScript. No Careca Studio ele era acessado pela sidebar como mais um modulo ao lado de SubtitleForge, Clip Splitter e Media Kit.

A decisao de arquitetura atual e separar o Partner Scout do Careca Studio. O Careca Studio fica focado em ferramentas de edicao, principalmente ClipSplitter e Subtitle Forge. O Partner Scout sera movido para um repositorio separado chamado `partner-scout` e futuramente podera virar modulo da Creator Intelligence Platform.

## Estrutura deste snapshot

- `source/src/modules/partner-scout/`: UI React, stores Zustand, schema, prompt, markdown, base de marcas e testes do modulo.
- `source/electron/ipc/partnerScout.ts`: handlers IPC do Partner Scout no processo principal do Electron.
- `source/electron/services/`: servicos Node usados pelo modulo, incluindo agente local, cache, historico, store e resolvedor de chave Gemini.
- `source/src/types/partner-scout-api.d.ts`: contrato inicial partner-only para a API exposta ao renderer.
- `source/src/index.css`: tokens Tailwind usados pela interface atual.
- `source/package.json` e configs: snapshot das configs atuais do Careca Studio para ajudar a recriar o ambiente.
- `docs/02-partner-scout.md`: prompt/plano original do modulo.
- `integration/careca-studio/`: arquivos que mostram como o modulo ainda esta plugado no shell do Careca Studio.

## Como rodar hoje

No Careca Studio original, antes da remocao das referencias:

```bash
npm install
npm run electron:dev
```

Depois, abrir o app e selecionar `Partner Scout` na sidebar.

Como repositorio independente, este snapshot ainda nao esta pronto para rodar sozinho. Ele precisa de um shell Electron/Vite dedicado, um preload partner-only e ajustes nos imports que hoje apontam para a estrutura do Careca Studio.

## Dependencias do Partner Scout

- Node.js 22+.
- Electron para IPC e janela desktop.
- React e ReactDOM para a UI.
- Zustand para estado do modulo.
- Tailwind CSS via Vite para estilos.
- electron-store para persistencia local de runs, cache e parceiros adicionados.
- Vitest para testes.
- Gemini API opcional via `GEMINI_API_KEY`.
- `fetch` nativo do Node/Electron para Gemini e para o handler legado de sinais do YouTube.

O codigo atual nao usa Playwright no runtime implementado, apesar do plano antigo citar scraping futuro.

## Arquivos identificados como Partner Scout

Arquivos fonte principais:

- `src/modules/partner-scout/**`
- `electron/ipc/partnerScout.ts`
- `electron/services/partner-scout-agent.ts`
- `electron/services/partner-scout-store.ts`
- `electron/services/brand-cache.ts`
- `electron/services/run-history.ts`
- `electron/services/gemini-key-resolver.ts`

Testes relacionados:

- `src/modules/partner-scout/**/*.test.ts`
- `electron/services/partner-scout-agent.test.ts`
- `electron/services/brand-cache.test.ts`
- `electron/services/run-history.test.ts`
- `electron/services/gemini-key-resolver.test.ts`

Referencias de integracao no Careca Studio:

- `src/App.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/types/electron.d.ts`
- `src/types/subtitle.ts`
- `electron/main.ts`
- `electron/preload.ts`
- `README.md`
- `.env.example`
- `tsconfig.electron.json`
- `scripts/test-partner-scout-real.ts`

## O que ainda precisa ajustar para virar repo independente

- Criar `electron/main.ts` e `electron/preload.ts` dedicados apenas ao Partner Scout.
- Trocar o namespace `window.careca.partnerScout` por uma API propria ou manter esse nome como compatibilidade.
- Ajustar imports dos servicos Electron que hoje apontam para `../../src/modules/partner-scout/...`.
- Corrigir `tsconfig.electron.json`, que ainda menciona `src/modules/partner-scout-v2`.
- Corrigir `scripts/test-partner-scout-real.ts`, que tambem referencia `partner-scout-v2`.
- Decidir se o perfil `ROBERTO_CARECA_PROFILE` fica neste repo ou na Creator Intelligence Platform.
- Renomear caminhos de persistencia/documentos que ainda citam `Careca Studio`.
- Criar um `package.json` enxuto, removendo dependencias de SubtitleForge, Clip Splitter e Media Kit.
- Remover o handler legado `partnerScout:fetchOfficialYoutubeSignals` quando a UI nao depender mais dele.

Nenhuma referencia foi removida do Careca Studio nesta etapa.
