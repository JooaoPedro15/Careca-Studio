<div align="center">
  <img src="resources/icon.png" alt="Careca Studio" width="96" height="96" />

  <h1>Careca Studio</h1>

  <p><strong>Aplicativo desktop para centralizar fluxos de produção de conteúdo, automação com IA e ferramentas comerciais do canal Roberto Careca.</strong></p>

  <p>
    <img alt="Electron" src="https://img.shields.io/badge/Electron-41-47848F?style=for-the-badge&logo=electron&logoColor=white" />
    <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=0B1220" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  </p>
</div>

---

## Sobre

O **Careca Studio** é um app desktop feito com Electron, React e TypeScript para reunir ferramentas internas de mídia, prospecção e materiais comerciais em uma única interface.

Ele funciona como um painel local: o renderer React cuida da experiência visual, o Electron faz a ponte segura com o sistema operacional e scripts Python executam os pipelines mais pesados.

## Funcionalidades

| Módulo | Status | O que faz |
| --- | --- | --- |
| **SubtitleForge** | Estável | Transcreve áudio/vídeo com Whisper e gera arquivos `.srt`. |
| **Clip Splitter** | Em evolução | Divide vídeos longos em cortes curtos com presets, fila e feedback por clipe. |
| **Media Kit** | Estável | Edita dados comerciais, templates e previews para materiais de apresentação. |
| **Partner Scout** | Em evolução | Mapeia marcas, calcula fit comercial e gera sugestões de abordagem. |

## Stack

- **Desktop:** Electron
- **Frontend:** React, TypeScript e Vite
- **Estilo:** Tailwind CSS
- **Estado:** Zustand
- **Ícones:** Lucide React
- **Testes:** Vitest
- **Workers locais:** Python para transcrição e processamento de mídia

## Arquitetura

```
┌──────────────────┐     IPC      ┌──────────────────┐     stdio     ┌──────────────────┐
│  Renderer React  │ ◄──────────► │ Electron main +  │ ◄───────────► │  Python workers  │
│  (Vite, Tailwind)│              │ preload bridge   │               │  (Whisper, FFmpeg)│
└──────────────────┘              └──────────────────┘               └──────────────────┘
        │                                  │
        ▼                                  ▼
   Zustand store                    electron-store
   (estado UI)                      (persistência)
```

- **Renderer** (`src/`): UI React + Tailwind, estado via Zustand
- **Main process** (`electron/`): IPC handlers, persistência, orquestração de workers
- **Workers Python** (`python/`): pipelines de transcrição (faster-whisper) e processamento de vídeo
- **Bundle splitting**: vendor (`react`/`react-dom`) e ícones em chunks separados para cache otimizado

## Pré-requisitos

- Node.js 22+
- npm 10+
- Python 3.10+
- FFmpeg e FFprobe disponíveis no sistema
- GPU NVIDIA com CUDA é opcional, mas recomendada para transcrição com Whisper

## Configuração

```bash
cp .env.example .env
# preencha GEMINI_API_KEY e YOUTUBE_API_KEY se quiser usar integrações de IA
```

Variáveis opcionais (apenas se for usar os respectivos módulos):

- `CARECA_SUBTITLE_FORGE_PATH`: caminho do ambiente Python usado pelo SubtitleForge
- `CARECA_CLIP_SPLITTER_PATH`: caminho do projeto externo usado pelo Clip Splitter
- `GEMINI_API_KEY`: chave para enriquecimento de marcas no Partner Scout
- `YOUTUBE_API_KEY`: chave para sincronização de métricas no Media Kit

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run electron:dev
```

Esse comando inicia o Vite, compila o processo principal do Electron em modo watch e abre o aplicativo desktop.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia apenas o renderer com Vite. |
| `npm run electron:dev` | Inicia o app completo em modo desenvolvimento. |
| `npm run build` | Compila renderer e processo principal. |
| `npm run electron:build` | Gera build do app Electron. |
| `npm test` | Executa a suíte de testes com Vitest. |
| `npm run test:watch` | Executa os testes em modo watch. |

## Estrutura

```text
careca-studio/
├─ electron/             # Processo principal, preload e handlers IPC
│  ├─ ipc/               # Handlers IPC (clipSplitter, partnerScout, pptx, subtitle)
│  └─ services/          # Serviços do main (cache, agent, run-history)
├─ python/               # Workers locais (faster-whisper, FFmpeg)
├─ resources/            # Ícones do aplicativo
├─ scripts/              # Scripts utilitários
├─ src/
│  ├─ components/
│  │  ├─ layout/         # Sidebar e Topbar
│  │  └─ ui/             # Primitivos (Button, Card, Badge…)
│  ├─ hooks/             # Hooks que conectam UI ao Electron
│  ├─ modules/           # Módulos de negócio
│  │  ├─ media-kit/
│  │  └─ partner-scout/
│  ├─ pages/             # Telas que ainda não viraram módulo
│  ├─ store/             # Estado global Zustand
│  └─ types/             # Contratos TypeScript compartilhados
└─ docs/                 # Documentação técnica
```

## Segurança

Reporte vulnerabilidades conforme [SECURITY.md](SECURITY.md).

## Licença

[MIT](LICENSE) © 2026 João Pedro Costa e Silva
