# Careca Studio - Documentacao Tecnica de Estudo

Este documento foi escrito para estudo, manutencao e entendimento profundo do projeto.

A ideia aqui e agir como um mapa do sistema:

- explicar o que cada parte faz
- mostrar como as partes se conectam
- deixar claro o raciocinio por tras da arquitetura
- apontar trechos mais complexos
- sugerir melhorias praticas

---

## 1. Visao geral do app

O Careca Studio e um aplicativo desktop feito com `Electron + React + TypeScript` que centraliza ferramentas internas de producao de conteudo.

Hoje o app tem estas ferramentas visiveis:

- `Subtitle Forge`
- `Clip Splitter`
- `Game Scout` placeholder
- `React Scout` placeholder

Na pratica, o Careca Studio funciona como um painel que organiza fluxos de processamento assicrono.

Ele nao faz o processamento pesado diretamente na interface. Em vez disso:

- o frontend coleta opcoes e mostra estados
- o Electron faz a ponte com o sistema
- scripts Python executam o trabalho pesado

Esse desenho faz sentido porque:

- React e muito bom para interface
- Electron e muito bom para desktop e integracao com OS
- Python e mais natural para IA, audio e video

---

## 2. Arquitetura geral

O sistema pode ser entendido em 3 camadas:

### 2.1 Renderer

Fica em `src/`.

Responsabilidades:

- desenhar a interface
- coletar acoes do usuario
- mostrar progresso, erro e sucesso
- ler e atualizar estado global

Tecnologias principais:

- React
- Zustand
- Tailwind

### 2.2 Main Process

Fica em `electron/`.

Responsabilidades:

- criar a janela do app
- abrir dialogos de arquivo e pasta
- executar subprocessos Python
- controlar fila de tarefas
- repassar eventos para a interface

### 2.3 Workers Python

Ficam em `python/` e na raiz do projeto.

Responsabilidades:

- transcrever audio/video
- gerar legenda `.srt`
- adaptar e executar pipeline de cortes
- exportar clips

---

## 3. Fluxo mental do app

Um jeito simples de visualizar:

1. o usuario clica em algo na interface
2. um hook React chama `window.careca`
3. o `preload` encaminha isso ao Electron
4. o Electron executa um processo Python
5. o Python emite progresso no `stdout`
6. o Electron interpreta esse progresso
7. o Zustand atualiza o estado
8. a interface re-renderiza

Esse e o fluxo mais importante do projeto inteiro.

Se voce entender esse caminho, o resto fica bem mais facil.

---

## 4. Estrutura de pastas

```text
careca-studio/
|-- electron/
|   |-- ipc/
|   |   |-- clipSplitter.ts
|   |   `-- subtitle.ts
|   |-- main.ts
|   `-- preload.ts
|-- python/
|   `-- subtitle_service.py
|-- src/
|   |-- components/
|   |-- hooks/
|   |-- lib/
|   |-- pages/
|   |-- store/
|   |-- types/
|   |-- App.tsx
|   |-- index.css
|   `-- main.tsx
|-- clip_splitter_service.py
|-- index.html
|-- package.json
|-- tsconfig.json
|-- tsconfig.electron.json
`-- vite.config.ts
```

---

## 5. Pasta por pasta

### `electron/`

Aqui esta o backend desktop do app.

O que faz:

- inicia a janela
- expoe comandos seguros para o frontend
- recebe pedidos de processamento
- sobe subprocessos Python

Por que existe:

- o React nao deve abrir processos nem acessar o sistema operacional diretamente

### `electron/ipc/`

Aqui ficam os handlers por ferramenta.

Eles funcionam como controladores do backend desktop.

Responsabilidades:

- iniciar jobs
- manter fila
- cancelar jobs
- interpretar eventos dos scripts Python

### `python/`

Guarda o worker local do Subtitle Forge.

Responsabilidade:

- receber parametros
- rodar a transcricao
- escrever `.srt`
- devolver progresso

### `src/`

Contem toda a interface React.

Subdivisao:

- `pages`: telas completas
- `components`: blocos menores de UI
- `hooks`: integracao UI <-> backend
- `store`: estado global
- `types`: contratos TypeScript
- `lib`: utilitarios

### raiz do projeto

Contem configuracoes gerais e tambem:

- `clip_splitter_service.py`

Esse arquivo existe na raiz porque ele atua como adaptador entre este app e o projeto externo `Clip-Splitter`.

---

## 6. Arquivos mais relevantes

### `package.json`

O que faz:

- lista dependencias
- define scripts
- organiza o ambiente Node

Como faz:

- usando `dependencies`, `devDependencies` e `scripts`

Por que existe:

- padroniza instalacao e execucao

---

### `vite.config.ts`

O que faz:

- configura o build do frontend

Como faz:

- ativa plugin React
- ativa plugin do Tailwind
- define alias `@`

Por que existe:

- melhora a organizacao do renderer

Observacao:

- `fastRefresh: false` e algo que vale revisar depois, porque nao e o default mais comum.

---

### `electron/main.ts`

O que faz:

- cria a janela principal
- carrega o app React
- registra handlers IPC
- expõe dialogos e comandos de janela

Como faz:

- usando `BrowserWindow`
- usando `ipcMain.handle`

Por que existe:

- e o ponto de entrada do processo principal do Electron

Interpretacao humana:

- este arquivo e como o gerente da aplicacao desktop

---

### `electron/preload.ts`

O que faz:

- cria a API `window.careca`

Como faz:

- usando `contextBridge.exposeInMainWorld`

Por que existe:

- ele protege a aplicacao
- cria uma ponte controlada entre frontend e backend

API principal exposta:

- `window`
- `dialog`
- `shell`
- `subtitle`
- `clipSplitter`

Este arquivo e um dos melhores para entender a fronteira entre interface e sistema.

---

### `electron/ipc/subtitle.ts`

O que faz:

- recebe pedidos de transcricao
- mantem fila
- sobe o processo Python
- interpreta JSON vindo do `stdout`
- trata erro e cancelamento
- em alguns casos tenta fallback para CPU

Como faz:

- cria registros internos de task
- monta linha de comando
- usa `spawn`
- processa eventos incrementais

Por que existe:

- centraliza toda a orquestracao do Subtitle Forge no backend desktop

Ponto importante:

- este nao e so um "arquivo que chama Python"
- ele tambem e um coordenador de fila e tradutor de protocolo

---

### `electron/ipc/clipSplitter.ts`

O que faz:

- inicia o split de video
- mantem fila
- sobe `clip_splitter_service.py`
- acompanha progresso
- informa uso de IA e fallback

Por que existe:

- o Clip Splitter precisa de uma camada de coordenacao semelhante a do Subtitle Forge

Diferenca importante:

- o pipeline de clip splitting atual esta mais acoplado a um projeto externo

---

### `python/subtitle_service.py`

O que faz:

- roda a transcricao com `faster-whisper`
- transforma segmentos em legendas
- aplica configuracoes como largura e maximo de palavras
- gera `.srt`
- emite progresso em JSON

Como faz:

- usa `argparse`
- carrega `WhisperModel`
- itera sobre segmentos
- grava o arquivo final

Por que existe:

- transcricao e formatacao de legenda combinam melhor com Python nesse contexto

---

### `clip_splitter_service.py`

Este e um dos arquivos mais importantes para entender o sistema atual.

O que faz:

- adapta o projeto externo `Clip-Splitter` para o padrao do Careca Studio
- tenta usar IA de contexto
- detecta fallback local
- organiza partes exportaveis
- emite progresso padronizado

Como faz:

- importa dinamicamente o modulo externo
- chama funcoes dele
- captura saida do processo
- traduz essa saida para eventos do app

Por que existe:

- reaproveitar um pipeline ja existente sem reescrever tudo do zero

Interpretacao humana:

- este arquivo e um tradutor entre dois mundos

---

### `src/main.tsx`

O que faz:

- inicializa o React
- renderiza `App`

Por que existe:

- e o bootstrap do renderer

---

### `src/App.tsx`

O que faz:

- monta o shell principal
- escolhe a pagina ativa
- conecta os hooks principais

Como faz:

- le `activeTool` do store
- renderiza `Sidebar`, `Topbar` e a pagina selecionada

Por que existe:

- centraliza a estrutura geral da interface

---

### `src/store/appStore.ts`

O que faz:

- guarda o estado global do app

Exemplos de dados:

- ferramenta ativa
- configuracoes do Subtitle Forge
- tarefas de legenda
- configuracoes do Clip Splitter
- tarefas de split
- caminho do video atual

Como faz:

- usa `zustand`
- define actions para atualizar esse estado
- usa funcoes `upsert` para mesclar progresso incremental em tasks

Por que existe:

- varios componentes precisam dos mesmos dados

Ponto pedagogico:

- o uso de `upsert` faz sentido porque as tarefas evoluem em etapas

---

### `src/hooks/useSubtitleForge.ts`

O que faz:

- faz a ponte entre UI e backend do Subtitle Forge

Responsabilidades:

- iniciar processamento
- cancelar task
- ouvir progresso
- atualizar store

Por que existe:

- separar regra de integracao da camada visual

---

### `src/hooks/useClipSplitter.ts`

O que faz:

- faz a ponte entre UI e backend do Clip Splitter

Responsabilidades:

- escolher video
- escolher pasta de saida
- iniciar split
- ouvir progresso
- atualizar store

---

### `src/pages/SubtitleForge.tsx`

O que faz:

- monta a tela da ferramenta de legenda

Mostra:

- upload
- configuracoes
- tarefas
- observacoes

---

### `src/pages/ClipSplitter.tsx`

O que faz:

- monta a tela da ferramenta de corte

Mostra:

- selecao de video
- configuracoes
- estatisticas
- tarefas
- estado de IA e fallback

---

### `src/components/ui/`

O que faz:

- agrupa os componentes visuais reutilizaveis

Exemplos:

- `Button`
- `Card`
- `Badge`
- `Toggle`
- `CustomSelect`
- `StatCard`

Por que existe:

- padronizar visual
- evitar repeticao

---

### `src/components/subtitle/`

Componentes especificos da area de legendas.

Principais:

- `DropZone`: entrada de arquivos
- `TaskList`: lista de jobs
- `TaskItem`: card de cada job
- `StatsBar`: indicadores agregados

---

### `src/components/clipSplitter/`

Componentes especificos da area de cortes.

Ponto importante:

- o `TaskItem` desta pasta mostra informacoes extras sobre IA e fallback

---

### `src/types/`

O que faz:

- define contratos TypeScript

Arquivos principais:

- `electron.d.ts`
- `subtitle.ts`
- `clipSplitter.ts`

Por que existe:

- ajuda a entender quais dados o app espera e produz

Observacao:

- `ToolId` esta em `subtitle.ts`, o que nao parece o lugar mais neutro para esse tipo.

---

### `src/lib/utils.ts`

O que faz:

- concentra helpers pequenos

Exemplos:

- formatar duracao
- formatar timestamp
- extrair nome de arquivo
- juntar classes CSS

---

## 7. Fluxo de dados por ferramenta

### 7.1 Subtitle Forge

Fluxo:

1. usuario escolhe um arquivo
2. `DropZone` ou botao chama o hook
3. `useSubtitleForge` chama `window.careca.subtitle.process`
4. o Electron recebe isso em `electron/ipc/subtitle.ts`
5. o handler sobe `python/subtitle_service.py`
6. o Python transcreve e emite JSON de progresso
7. o Electron interpreta os eventos
8. o store atualiza a task
9. a UI mostra progresso, erro ou sucesso

Resultado final:

- arquivo `.srt`

### 7.2 Clip Splitter

Fluxo:

1. usuario escolhe um video
2. `useClipSplitter` chama `window.careca.clipSplitter.process`
3. o Electron sobe `clip_splitter_service.py`
4. esse service carrega o projeto externo `Clip-Splitter`
5. o pipeline gera sugestoes de corte
6. o service exporta os clips
7. o Electron repassa progresso para a UI
8. o store atualiza a task
9. a UI mostra quantidade de clips, pasta de saida e status de IA

---

## 8. O que faz, como faz e por que existe: pontos centrais

### A. `window.careca`

O que faz:

- e a API interna do app para o frontend

Como faz:

- `preload.ts` expoe metodos seguros no `window`

Por que existe:

- a interface nao deve acessar Node diretamente

### B. Eventos em tempo real

O que fazem:

- mantem a UI atualizada durante jobs longos

Como fazem:

- o Python emite JSON
- o Electron parseia
- o hook atualiza o store

Por que existem:

- jobs de midia e IA demoram
- o usuario precisa de feedback

### C. Fila de tarefas

O que faz:

- processa jobs em ordem

Como faz:

- mantendo estruturas internas no handler IPC

Por que existe:

- evita concorrencia excessiva
- reduz risco em GPU, CPU e IO

### D. Adaptador do Clip Splitter

O que faz:

- conecta o app a um projeto externo

Como faz:

- importando modulo dinamicamente e traduzindo resultados

Por que existe:

- reaproveitar um pipeline ja pronto

---

## 9. Trechos mais complexos ou que merecem estudo extra

### `electron/ipc/subtitle.ts`

Por que e complexo:

- mistura fila, subprocesso, parse de eventos, fallback e cancelamento

Como estudar:

- primeiro entenda a criacao da task
- depois entenda o spawn
- depois entenda como uma linha de `stdout` vira evento de UI

### `clip_splitter_service.py`

Por que e complexo:

- ele nao e apenas um worker
- ele tambem e uma camada de adaptacao

Como estudar:

- primeiro localize onde ele carrega o projeto externo
- depois veja onde ele traduz o resultado para o formato do Careca Studio

### `appStore.ts`

Por que merece atencao:

- boa parte da leitura do app depende de entender como as tasks sao atualizadas

### Hooks de integracao

Por que merecem atencao:

- eles sao a cola entre UI e backend

---

## 10. Dependencias e integracoes externas

### Dependencias de frontend

- React
- Zustand
- Tailwind
- Lucide

### Dependencias de desktop/backend

- Electron
- subprocessos Node

### Dependencias de processamento

- Python
- faster-whisper
- ffmpeg
- ffprobe

### Integracoes locais externas

- `D:\Projetos\subtitle-forge`
- `D:\Projetos\Clip-Splitter`

Observacao importante:

- o app depende fortemente do ambiente da maquina onde esta rodando

---

## 11. Problemas de organizacao, legibilidade ou manutencao

### 1. Caminhos hardcoded

Impacto:

- dificulta portabilidade
- dificulta onboarding em outra maquina

### 2. Duplicacao entre handlers IPC

Impacto:

- aumenta custo de manutencao

### 3. Store unico muito central

Impacto:

- pode crescer demais conforme novas ferramentas entram

### 4. Contrato do Clip Splitter pouco explicito

Hipotese:

- parte das configuracoes da UI pode nao afetar todos os ramos do pipeline da mesma forma

Impacto:

- o comportamento pode parecer inconsistente para quem mantem o app

### 5. Encoding inconsistente

Impacto:

- piora leitura e confianca no codigo

### 6. Documentacao antiga defasada

Impacto:

- dificulta entender o estado real do projeto

### 7. Falta de testes automatizados

Impacto:

- refactors ficam mais arriscados

---

## 12. Melhorias praticas sugeridas

### Curto prazo

- corrigir encoding para UTF-8 consistente
- mover tipos globais para arquivos mais neutros
- documentar o protocolo de eventos JSON
- transformar caminhos externos em configuracao
- manter este documento atualizado

### Medio prazo

- separar o store por dominio
- extrair codigo comum entre `subtitle.ts` e `clipSplitter.ts`
- organizar melhor servicos Python locais
- persistir configuracoes do usuario

### Longo prazo

- reduzir acoplamento com projetos externos
- criar testes para parsers e fluxo de task
- formalizar uma camada comum para workers Python

---

## 13. Resumo do funcionamento geral do app

O Careca Studio e um shell desktop para pipelines de conteudo com IA. O React monta a experiencia visual. O Electron atua como ponte segura com o sistema operacional e coordena jobs. Os scripts Python fazem o processamento pesado. O Zustand guarda o estado vivo da sessao. O app opera por eventos: o backend emite progresso e a interface reage a isso.

---

## 14. Principais pontos que voce ainda precisa entender

- como `renderer`, `preload` e `main` se diferenciam no Electron
- como `window.careca` conecta frontend e backend
- como o store atualiza tasks incrementalmente
- como o `stdout` do Python vira evento da interface
- como o Subtitle Forge gera `.srt`
- como o Clip Splitter depende de um projeto externo
- como separar responsabilidade de UI, orquestracao e processamento

---

## 15. Lista de estudos recomendada em ordem de prioridade

1. Electron basico: `main`, `preload`, IPC
2. Zustand: estado global e actions
3. React hooks: `useEffect`, `useState`, `useEffectEvent`
4. `spawn` e subprocessos no Node
5. Python CLI com `argparse`
6. `ffmpeg` e `ffprobe`
7. `faster-whisper`
8. desenho de arquitetura com adapters e workers

---

## 16. Proximos passos para conseguir manter e evoluir o projeto sozinho

1. Ler uma ferramenta de ponta a ponta antes de tentar refatorar.
2. Desenhar o fluxo "UI -> preload -> IPC -> Python -> UI" com setas simples.
3. Validar no codigo quais configuracoes realmente afetam cada pipeline.
4. Padronizar configuracao externa e remover caminhos fixos.
5. Refatorar primeiro para clareza, nao para "sofisticacao".
6. Criar testes pequenos nos pontos de protocolo antes de mexer em partes delicadas.
7. Atualizar a documentacao toda vez que uma integracao mudar.

---

## 17. Fechamento

O projeto ja tem uma base funcional boa. O desafio principal agora nao e fazer o app "rodar", e sim fazer com que ele fique facil de entender, manter e evoluir. A melhor estrategia para isso e consolidar arquitetura, reduzir acoplamento escondido e transformar conhecimento implicito em documentacao explicita.
