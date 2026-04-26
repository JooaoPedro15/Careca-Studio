// ── Ícones usados na interface (lucide-react é a lib de ícones)
import { Film, FolderOutput, FolderSearch, Scissors, Waves } from 'lucide-react'
// ── Hooks do React: useMemo memoriza valores caros, useState gerencia estado local
import { useMemo, useState } from 'react'

// ── Componente que renderiza a lista de tarefas (jobs) do clip splitter
import { ClipSplitterTaskList } from '@/components/clipSplitter/TaskList'
// ── Componentes de UI reutilizáveis do design system do app
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { StatCard } from '@/components/ui/StatCard'
import { Toggle } from '@/components/ui/Toggle'
// ── Utilitário que extrai o nome do arquivo a partir de um caminho completo
import { getFileName } from '@/lib/utils'
// ── Store global do app (Zustand) — contém estado compartilhado entre páginas
import { useAppStore } from '@/store/appStore'
import type { ClipFeedbackLabel, ClipSplitterClip } from '@/types/clipSplitter'

// ── Tipagem das props que o componente pai precisa fornecer (callbacks de ações)
interface ClipSplitterPageProps {
  /** Abre o file picker nativo para o usuário escolher a pasta de saída */
  onPickOutputDir: () => Promise<{ ok: boolean; message: string | null }>
  /** Abre o file picker nativo para o usuário escolher o vídeo fonte */
  onPickSourceFile: () => Promise<{ ok: boolean; message: string | null }>
  /** Dispara o processo de split/exportação dos clips */
  onStartSplit: () => Promise<{ ok: boolean; message: string | null }>
  /** Cancela uma tarefa específica da fila, identificada pelo taskId */
  onCancelTask: (taskId: string) => void
  /** Abre a pasta de saída no explorador de arquivos do SO */
  onOpenOutput: (outputDir: string | null) => void
  /** Re-executa uma tarefa que falhou, usando o mesmo sourcePath */
  onRetryTask: (sourcePath: string) => void
  /** Salva o feedback manual do usuario para um clip especifico */
  onSaveClipFeedback: (taskId: string, clip: ClipSplitterClip, label: ClipFeedbackLabel | null) => Promise<{ ok: boolean; message: string | null }>
}

/**
 * Página principal do Clip Splitter.
 * Permite ao usuário selecionar um vídeo longo, configurar a estratégia de corte
 * (fixo, silêncio, IA) e exportar os clips em lote via FFmpeg.
 */
export function ClipSplitterPage({
  onPickOutputDir,
  onPickSourceFile,
  onStartSplit,
  onCancelTask,
  onOpenOutput,
  onRetryTask,
  onSaveClipFeedback,
}: ClipSplitterPageProps) {
  // ── Estado local: mensagem de feedback exibida após uma ação (ex: erro ou sucesso)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  // ── Leitura de fatias do estado global via Zustand (cada seletor isola re-renders)
  const sourcePath = useAppStore((state) => state.clipSplitterSourcePath) // caminho do vídeo selecionado
  const settings = useAppStore((state) => state.clipSplitterSettings) // configurações de corte atuais
  const tasks = useAppStore((state) => state.clipSplitterTasks) // lista de tarefas (jobs) criados
  const patchSettings = useAppStore((state) => state.patchClipSplitterSettings) // fn para atualizar settings parcialmente
  const setOutputDir = useAppStore((state) => state.setClipSplitterOutputDir) // fn para definir pasta de saída

  // ── Deriva o nome curto do arquivo (ex: "video.mp4") ou mensagem padrão
  const sourceName = sourcePath ? getFileName(sourcePath) : 'Nenhum video selecionado'

  // ── Filtra tarefas por status para exibir contadores e alertas
  const completedTasks = tasks.filter((task) => task.status === 'completed')
  const activeTasks = tasks.filter(
    (task) => task.status === 'queued' || task.status === 'preparing' || task.status === 'processing',
  )
  // ── Tarefas que pediram IA mas caíram em fallback local (Whisper/Gemini indisponível)
  const fallbackTasks = tasks.filter((task) => task.aiRequested && task.aiUsed === false)

  // ── Soma total de clips gerados por todas as tarefas concluídas nesta sessão
  const exportedClips = completedTasks.reduce((total, task) => total + task.clipsCreated, 0)

  // ── Pega a pasta de saída mais recente: primeiro das tasks, depois do settings, senão null
  const latestOutputDir = tasks.find((task) => task.outputDir)?.outputDir ?? settings.outputDir ?? null

  // ── Texto descritivo que muda conforme o modo selecionado (memorizado para evitar recálculo)
  const modeDescription = useMemo(() => {
    if (settings.mode === 'fixed') {
      return 'Corta por janela de tempo constante, sem depender da deteccao de pausas.'
    }

    return 'Procura pausas de silencio e tenta encaixar o corte perto do alvo de duracao.'
  }, [settings.mode])

  /**
   * Wrapper genérico para executar uma ação assíncrona (pick file, start split, etc.)
   * e atualizar a mensagem de feedback na UI com o resultado.
   */
  async function runAction(action: () => Promise<{ ok: boolean; message: string | null }>) {
    const result = await action()
    setActionMessage(result.message)
  }

  // ── Início do JSX — layout principal da página ─────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Linha de stat cards no topo: fonte, clips exportados, fila ──────── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card que mostra o status do vídeo fonte selecionado */}
        <StatCard
          hint={sourcePath ? sourceName : 'Escolha o bruto principal para ativar a exportacao.'}
          icon={<Film className="h-4 w-4" />}
          label="Fonte atual"
          value={sourcePath ? 'Video carregado' : 'Aguardando'}
        />
        {/* Card que mostra quantos clips já foram exportados nesta sessão */}
        <StatCard
          hint="Soma dos clips entregues pelos jobs concluidos nesta sessao."
          icon={<Scissors className="h-4 w-4" />}
          label="Clips exportados"
          value={String(exportedClips)}
        />
        {/* Card que mostra se há jobs na fila ou se está livre */}
        <StatCard
          hint={activeTasks.length > 0 ? 'Existe job rodando ou aguardando na fila.' : 'Fila livre para novos cortes.'}
          icon={<FolderOutput className="h-4 w-4" />}
          label="Fila"
          value={activeTasks.length > 0 ? `${activeTasks.length} ativo(s)` : 'Livre'}
        />
      </div>

      {/* ── Grid principal: coluna esquerda (entrada + tasks) | coluna direita (config) */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.95fr]">
        {/* ════════ COLUNA ESQUERDA ════════ */}
        <div className="space-y-6">
          {/* ── Card de entrada: seleção de vídeo e ações principais ────────── */}
          <Card className="space-y-5 overflow-hidden bg-gradient-to-br from-status-green/10 via-transparent to-transparent">
            {/* Cabeçalho do card com título, descrição e badge do modo ativo */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Entrada</p>
                <h3 className="mt-2 text-2xl font-semibold text-text-primary">Video base para o split</h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-text-secondary">
                  Escolha um video longo, ajuste a estrategia de corte e exporte o pacote de clips em lote.
                </p>
              </div>
              {/* Badge colorido indica o modo atual: IA (verde), Silêncio (azul) ou Fixo (amarelo) */}
              <Badge tone={settings.useAi ? 'green' : settings.mode === 'silence' ? 'blue' : 'yellow'}>
                {settings.useAi ? 'IA ativa' : settings.mode === 'silence' ? 'Silencio' : 'Fixo'}
              </Badge>
            </div>

            {/* ── Alerta de fallback: aparece quando algum job pediu IA mas não conseguiu usar */}
            {fallbackTasks.length > 0 ? (
              <div className="rounded-2xl border border-status-yellow/25 bg-status-yellow/8 px-4 py-3 text-sm text-status-yellow">
                {fallbackTasks.length} job(s) desta sessao cairam em fallback local sem IA. Veja o motivo em cada card.
              </div>
            ) : null}

            {/* ── Box com o nome e caminho completo do arquivo selecionado ──── */}
            <div className="rounded-2xl border border-white/8 bg-black/16 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Arquivo selecionado</p>
              <p className="mt-3 text-lg font-medium text-text-primary">{sourceName}</p>
              <p className="mt-2 break-all font-mono text-xs text-text-muted">{sourcePath ?? 'Nenhum caminho carregado.'}</p>
            </div>

            {/* ── Botões de ação: selecionar vídeo, escolher pasta, exportar, abrir saída */}
            <div className="flex flex-wrap gap-3">
              {/* Abre o file picker para selecionar o vídeo fonte */}
              <Button onClick={() => void runAction(onPickSourceFile)}>Selecionar video</Button>
              {/* Abre o file picker para escolher a pasta de saída dos clips */}
              <Button onClick={() => void runAction(onPickOutputDir)} variant="ghost">
                Escolher pasta de saida
              </Button>
              {/* Inicia o processo de exportação/split dos clips */}
              <Button onClick={() => void runAction(onStartSplit)} variant="ghost">
                Exportar clips
              </Button>
              {/* Só aparece se já existe uma pasta de saída — abre no explorador do SO */}
              {latestOutputDir ? (
                <Button leadingIcon={<FolderSearch className="h-4 w-4" />} onClick={() => onOpenOutput(latestOutputDir)} variant="ghost">
                  Abrir saida
                </Button>
              ) : null}
            </div>

            {/* ── Mensagem de feedback (erro/sucesso) exibida após uma ação ── */}
            {actionMessage ? <p className="text-sm text-amber-300">{actionMessage}</p> : null}
          </Card>

          {/* ── Lista de tarefas (jobs) — mostra progresso, status, ações de cada task */}
          <ClipSplitterTaskList
            onCancel={onCancelTask}
            onOpenOutput={onOpenOutput}
            onRetry={onRetryTask}
            onSaveFeedback={(taskId, clip, label) => {
              void runAction(() => onSaveClipFeedback(taskId, clip, label))
            }}
            tasks={tasks}
          />
        </div>

        {/* ════════ COLUNA DIREITA ════════ */}
        <div className="space-y-6">
          {/* ── Card de configuração de corte ──────────────────────────────── */}
          <Card className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Regra de split</p>
              <h3 className="mt-2 text-xl font-semibold text-text-primary">Configuracao de corte</h3>
            </div>

            {/* ── Toggle para ativar/desativar a IA de contexto (Whisper + Gemini) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-text-secondary">
                <span>Usar IA de contexto</span>
                <Toggle checked={settings.useAi} onChange={(checked) => patchSettings({ useAi: checked })} />
              </div>
            </div>

            {/* ── Seletor de modo: "Silêncio + alvo de duração" ou "Duração fixa" */}
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Modo</span>
              <CustomSelect
                value={settings.mode}
                onChange={(value) => patchSettings({ mode: value as typeof settings.mode })}
                options={[
                  { value: 'silence', label: 'Silencio + alvo de duracao' },
                  { value: 'fixed', label: 'Duracao fixa' },
                ]}
              />
              {/* Texto explicativo que muda dinamicamente conforme o modo selecionado */}
              <p className="text-sm leading-6 text-text-secondary">{modeDescription}</p>
            </div>

            {/* ── Campos numéricos de configuração (grid 2 colunas) ─────────── */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Duração alvo por clip em segundos (o FFmpeg tenta cortar perto disso) */}
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Alvo por clip (s)</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/16 px-4 py-3 text-text-primary outline-none transition focus:border-white/30"
                  max={settings.maxClipDurationSec}
                  min={settings.minClipDurationSec}
                  onChange={(event) => patchSettings({ targetDurationSec: Number(event.target.value) || 10 })}
                  type="number"
                  value={settings.targetDurationSec}
                />
              </label>

              {/* Duração mínima — clips menores que isso são descartados ou mesclados */}
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Clip minimo (s)</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/16 px-4 py-3 text-text-primary outline-none transition focus:border-white/30"
                  min={3}
                  max={Math.max(3, settings.maxClipDurationSec - 1)}
                  onChange={(event) => patchSettings({ minClipDurationSec: Number(event.target.value) || 3 })}
                  type="number"
                  value={settings.minClipDurationSec}
                />
              </label>

              {/* Duração máxima — clips maiores que isso são divididos novamente */}
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Clip maximo (s)</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/16 px-4 py-3 text-text-primary outline-none transition focus:border-white/30"
                  min={settings.minClipDurationSec + 1}
                  onChange={(event) => patchSettings({ maxClipDurationSec: Number(event.target.value) || 5 })}
                  type="number"
                  value={settings.maxClipDurationSec}
                />
              </label>

              {/* Duração mínima de silêncio para ser considerado pausa (modo silêncio) */}
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Silencio min. (s)</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/16 px-4 py-3 text-text-primary outline-none transition focus:border-white/30"
                  min={0.1}
                  onChange={(event) => patchSettings({ silenceMinDurationSec: Number(event.target.value) || 0.1 })}
                  step="0.05"
                  type="number"
                  value={settings.silenceMinDurationSec}
                />
              </label>

              {/* Threshold em dB abaixo do qual o áudio é considerado silêncio (ocupa 2 colunas) */}
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Threshold de silencio (dB)</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/16 px-4 py-3 text-text-primary outline-none transition focus:border-white/30"
                  max={-5}
                  min={-90}
                  onChange={(event) => patchSettings({ silenceThresholdDb: Number(event.target.value) || -35 })}
                  type="number"
                  value={settings.silenceThresholdDb}
                />
              </label>

              {/* Campo de texto para pasta de saída customizada (opcional, ocupa 2 colunas) */}
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs uppercase tracking-[0.2em] text-text-muted">Pasta de saida</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-black/16 px-4 py-3 font-mono text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-white/30"
                  onChange={(event) => setOutputDir(event.target.value.trim() || null)}
                  placeholder="Opcional: D:\\Projetos\\clips\\episodio-01"
                  value={settings.outputDir ?? ''}
                />
              </label>
            </div>

            <p className="text-xs leading-6 text-text-muted">
              O alvo sempre fica entre o minimo e o maximo. Se voce aumentar o minimo ou reduzir o maximo, o alvo e
              ajustado automaticamente.
            </p>

            <div className="rounded-xl border border-white/8 bg-black/16 px-4 py-4 text-sm leading-6 text-text-secondary">
              Marque clips como <span className="text-text-primary">Bom</span>, <span className="text-text-primary">Viral</span> ou <span className="text-text-primary">Fraco</span> apos cada exportacao.
              O Clip Splitter passa a usar esse historico local para orientar os proximos cortes com IA.
            </div>
          </Card>

          {/* ── Card informativo: explica como o motor de split funciona ──── */}
          <Card className="space-y-4">
            {/* Cabeçalho com ícone e descrição geral */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-white">
                <Waves className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-medium text-text-primary">Como esse motor trabalha</p>
                <p className="text-sm text-text-secondary">
                  Exporta um clip por vez e depende de FFmpeg/FFprobe disponiveis na maquina.
                </p>
              </div>
            </div>

            {/* ── Blocos explicativos de cada modo/funcionalidade ────────────── */}
            <div className="space-y-3 text-sm leading-6 text-text-secondary">
              {/* Explica o modo fixo */}
              <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="font-medium text-text-primary">Modo fixo</p>
                <p>Quebra o bruto em janelas constantes quando voce quer ritmo previsivel e rapido.</p>
              </div>
              {/* Explica o modo silêncio */}
              <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="font-medium text-text-primary">Modo silencio</p>
                <p>Tenta alinhar o corte nas pausas para evitar quebra seca no meio da fala.</p>
              </div>
              {/* Explica a IA de contexto */}
              <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="font-medium text-text-primary">IA de contexto</p>
                <p>Quando ativa, usa transcricao com Whisper e Gemini para sugerir partes por contexto narrativo.</p>
              </div>
              {/* Explica o comportamento padrão da pasta de saída */}
              <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-4">
                <p className="font-medium text-text-primary">Saida padrao</p>
                <p>Sem pasta customizada, o app cria uma pasta irm a do arquivo com sufixo `-clips`.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
