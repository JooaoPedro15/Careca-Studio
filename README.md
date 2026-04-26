# Careca Studio

Ferramenta desktop interna para automatizar e centralizar o workflow de produÃ§Ã£o de conteÃºdo do canal Roberto Careca.

## Stack

- **Runtime**: Electron (main + renderer)
- **Frontend**: React + TypeScript + Vite
- **Estilos**: Tailwind CSS v4
- **Estado**: Zustand
- **Ãcones**: Lucide React

## Ferramentas

| Ferramenta | Status | DescriÃ§Ã£o |
|------------|--------|-----------|
| SubtitleForge | Em desenvolvimento | TranscriÃ§Ã£o de Ã¡udio via Whisper â†’ `.srt` |
| Clip Splitter | Em estruturacao | Planejamento de cortes curtos com presets de split e saida |
| Game Scout | Planejado | Pesquisa de jogos em alta para shorts/reels |
| React Scout | Planejado | Pesquisa de animes/sÃ©ries em alta para reacts |

## PrÃ©-requisitos

- Node.js 22+
- npm 10+
- Python 3.10+ (para SubtitleForge)
- NVIDIA GPU com CUDA (opcional, fallback para CPU)
- Projeto [subtitle-forge](../subtitle-forge/) clonado em `D:\Projetos\subtitle-forge`

## Setup

```bash
# Instalar dependÃªncias
npm install

# Rodar em modo dev (Vite + Electron)
npm run electron:dev

# Build de produÃ§Ã£o
npm run electron:build
```

## Estrutura do Projeto

```
careca-studio/
â”œâ”€â”€ electron/                  # Processo principal do Electron
â”‚   â”œâ”€â”€ main.ts                # Entry point, criaÃ§Ã£o da janela, seguranÃ§a
â”‚   â”œâ”€â”€ preload.ts             # contextBridge (API exposta ao renderer)
â”‚   â””â”€â”€ ipc/                   # Handlers IPC organizados por ferramenta
â”‚       â”œâ”€â”€ subtitle.ts        # Spawn do Python, parse de stdout, fila
â”‚       â””â”€â”€ scout.ts           # (futuro) Game/React Scout
â”œâ”€â”€ src/                       # Renderer (React)
â”‚   â”œâ”€â”€ App.tsx                # Shell: Sidebar + Topbar + pÃ¡gina ativa
â”‚   â”œâ”€â”€ main.tsx               # Entry point React
â”‚   â”œâ”€â”€ index.css              # Tailwind + design system (@theme)
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ Sidebar.tsx        # Nav lateral 64px com Ã­cones
â”‚   â”‚   â”œâ”€â”€ Topbar.tsx         # Titlebar custom + window controls
â”‚   â”‚   â”œâ”€â”€ ui/                # Componentes base reutilizÃ¡veis
â”‚   â”‚   â”‚   â”œâ”€â”€ Badge.tsx      # Pill de status (green/yellow/blue/red)
â”‚   â”‚   â”‚   â”œâ”€â”€ Button.tsx     # Primary e ghost
â”‚   â”‚   â”‚   â”œâ”€â”€ Card.tsx       # Container bg-surface
â”‚   â”‚   â”‚   â””â”€â”€ StatCard.tsx   # Label + valor
â”‚   â”‚   â””â”€â”€ subtitle/          # Componentes do SubtitleForge
â”‚   â”‚       â”œâ”€â”€ DropZone.tsx   # Drag & drop de arquivos
â”‚   â”‚       â”œâ”€â”€ TaskItem.tsx   # Card de task individual
â”‚   â”‚       â”œâ”€â”€ TaskList.tsx   # Lista de tasks
â”‚   â”‚       â””â”€â”€ StatsBar.tsx   # Stats: GPU, tempo mÃ©dio, contagem
â”‚   â”œâ”€â”€ hooks/
â”‚   â”‚   â””â”€â”€ useSubtitleForge.ts # LÃ³gica IPC + store do SubtitleForge
â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â”œâ”€â”€ SubtitleForge.tsx  # PÃ¡gina principal do SubtitleForge
â”‚   â”‚   â”œâ”€â”€ GameScout.tsx      # (placeholder)
â”‚   â”‚   â””â”€â”€ ReactScout.tsx     # (placeholder)
â”‚   â”œâ”€â”€ store/
â”‚   â”‚   â””â”€â”€ appStore.ts        # Zustand: tool ativa, config, tasks
â”‚   â””â”€â”€ types/
â”‚       â””â”€â”€ electron.d.ts      # Tipagem global window.careca
â”œâ”€â”€ dist/                      # Build do renderer (Vite output)
â”œâ”€â”€ dist-electron/             # Build do main process (tsc output)
â”œâ”€â”€ index.html                 # HTML com CSP + Google Fonts
â”œâ”€â”€ package.json
â”œâ”€â”€ vite.config.ts
â”œâ”€â”€ tsconfig.json              # Config TS do renderer
â””â”€â”€ tsconfig.electron.json     # Config TS do main process
```

## Design System

### Cores

| Token | Hex | Uso |
|-------|-----|-----|
| `bg-app` | `#0e0e10` | Fundo principal |
| `bg-surface` | `#131316` | Cards, painÃ©is |
| `bg-dark` | `#0a0a0c` | Sidebar, topbar |
| `accent` | `#7c3aed` | Destaque principal (purple) |
| `accent-dim` | `rgba(124,58,237,0.15)` | Hover, seleÃ§Ã£o |
| `border` | `rgba(255,255,255,0.06)` | Bordas padrÃ£o |
| `status-green` | `#4ade80` | Sucesso, pronto |
| `status-yellow` | `#facc15` | Processando |
| `status-blue` | `#60a5fa` | Na fila, info |
| `status-red` | `#f87171` | Erro |

### Fontes

- **Display/Body**: Space Grotesk
- **Mono**: JetBrains Mono (badges, paths, timestamps)

## Arquitetura IPC

Toda comunicaÃ§Ã£o renderer â†” main usa `contextBridge` (nunca `nodeIntegration`):

```
Renderer (React)
  â†’ window.careca.subtitle.process(filePath, options)
  â†’ ipcRenderer.invoke('subtitle:process', ...)

Main Process
  â†’ ipcMain.handle('subtitle:process', ...)
  â†’ spawn('python', ['subtitle_forge.py', ...])
  â†’ stdout parsing â†’ sender.send('subtitle:progress', data)

Renderer (React)
  â† window.careca.subtitle.onProgress(callback)
  â† ipcRenderer.on('subtitle:progress', ...)
```

**Eventos IPC do SubtitleForge:**
- `subtitle:process` â€” inicia transcriÃ§Ã£o, retorna taskId
- `subtitle:cancel` â€” cancela processo por taskId
- `subtitle:progress` â€” progresso (model loading, segments, etc.)
- `subtitle:done` â€” transcriÃ§Ã£o concluÃ­da
- `subtitle:error` â€” erro no processo

## ConvenÃ§Ãµes

- **TypeScript estrito** â€” sem `any` sem justificativa
- **Componentes** max ~150 linhas, lÃ³gica em hooks customizados
- **IPC events**: `ferramenta:aÃ§Ã£o` (ex: `subtitle:process`)
- **Store**: slices por ferramenta (`useAppStore().subtitle`)
- **SeguranÃ§a**: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`

## ContinuaÃ§Ã£o do Projeto

### Estado Atual

O projeto estÃ¡ na **Etapa 1 + 2** (Setup + SubtitleForge). O plano completo estÃ¡ em `.claude/plans/deep-petting-flask.md`.

### Ordem de implementaÃ§Ã£o

A construÃ§Ã£o segue 5 fases sequenciais:

1. **Fase A â€” Skeleton**: package.json, configs (TS, Vite, Tailwind), index.html, CSS
2. **Fase B â€” Electron**: main.ts, preload.ts, tipos globais
3. **Fase C â€” React Shell**: entry point, store, componentes UI, Sidebar, Topbar, App.tsx, pÃ¡ginas placeholder
4. **Fase D â€” SubtitleForge Backend**: IPC handler (spawn Python, parse stdout), registrar no main.ts
5. **Fase E â€” SubtitleForge Frontend**: hook useSubtitleForge, DropZone, TaskList, StatsBar, pÃ¡gina final

### PrÃ³ximas etapas (apÃ³s Etapa 2)

- **Etapa 3 â€” Game Scout**: pesquisa de jogos trending via Claude API
- **Etapa 4 â€” React Scout**: pesquisa de animes/sÃ©ries trending
- **Etapa 5 â€” Polimento**: auto-updater, notificaÃ§Ãµes nativas, configs persistidas, atalhos globais

### Para continuar o desenvolvimento

```bash
# Abrir no Claude Code e pedir para executar o plano:
# "execute o plano das etapas 1 e 2 do careca studio"

# Ou fase por fase:
# "execute a Fase A do plano â€” skeleton do projeto"
# "execute a Fase B â€” electron main e preload"
# etc.
```

### Riscos conhecidos

- **Python no PATH**: validar `python --version` no startup do app
- **stdout bufferizado**: usar `PYTHONUNBUFFERED=1` no spawn
- **VRAM**: processar 1 arquivo por vez (fila sequencial)
- **Electron ESM**: se houver problemas, trocar para CommonJS no electron/

## DependÃªncias Externas

- [subtitle-forge](../subtitle-forge/) â€” projeto Python em `D:\Projetos\subtitle-forge`
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper) â€” motor de transcriÃ§Ã£o
- CUDA Toolkit + cuDNN (para aceleraÃ§Ã£o GPU)
