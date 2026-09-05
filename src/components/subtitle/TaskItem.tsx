import { FolderSearch, LoaderCircle, RotateCcw, Square, TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatDuration, formatTaskStatus, formatTimestamp } from '@/lib/utils'
import type { HardsubMode, SubtitleTask } from '@/types/subtitle'

interface TaskItemProps {
  task: SubtitleTask
  onCancel: (taskId: string) => void
  onOpenOutput: (outputPath: string | null) => void
  onRetry: (filePath: string) => void
  onBurn: (taskId: string, mode: HardsubMode) => void
}

const LANGUAGE_LABELS: Record<string, string> = {
  pt: 'português',
  en: 'inglês',
  es: 'espanhol',
  fr: 'francês',
  de: 'alemão',
  it: 'italiano',
  ja: 'japonês',
  ko: 'coreano',
  ru: 'russo',
  zh: 'chinês',
}

function labelForLanguage(code: string): string {
  return LANGUAGE_LABELS[code] ?? code
}

// Define a cor do badge de status sem espalhar a regra no JSX.
function resolveTone(status: SubtitleTask['status']) {
  switch (status) {
    case 'completed':
      return 'green'
    case 'processing':
    case 'preparing':
      return 'yellow'
    case 'queued':
      return 'blue'
    case 'error':
    case 'cancelled':
      return 'red'
    default:
      return 'neutral'
  }
}

export function TaskItem({ task, onCancel, onOpenOutput, onRetry, onBurn }: TaskItemProps) {
  // Agrupa os estados que ainda permitem acompanhar ou cancelar o processamento.
  const isActive = task.status === 'queued' || task.status === 'preparing' || task.status === 'processing'

  return (
    <Card className="space-y-5">
      {/* Cabecalho com nome do arquivo, status atual e acoes disponiveis. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-medium text-text-primary">{task.fileName}</h4>
            <Badge tone={resolveTone(task.status)}>{formatTaskStatus(task.status)}</Badge>
            <Badge>{task.device === 'cpu' ? 'CPU' : 'GPU'}</Badge>
          </div>
          <p className="font-mono text-xs text-text-muted">{task.filePath}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isActive ? (
            <Button
              leadingIcon={<Square className="h-3.5 w-3.5" />}
              onClick={() => onCancel(task.id)}
              variant="danger"
            >
              Cancelar
            </Button>
          ) : null}
          {task.outputPath ? (
            <Button
              leadingIcon={<FolderSearch className="h-4 w-4" />}
              onClick={() => onOpenOutput(task.outputPath)}
              variant="ghost"
            >
              Abrir saída
            </Button>
          ) : null}
          {Object.entries(task.translatedOutputs).map(([lang, path]) => (
            <Button
              key={lang}
              leadingIcon={<FolderSearch className="h-4 w-4" />}
              onClick={() => onOpenOutput(path)}
              variant="ghost"
            >
              Abrir .{lang}.srt
            </Button>
          ))}
          {(task.status === 'error' || task.status === 'cancelled') && (
            <Button
              leadingIcon={<RotateCcw className="h-4 w-4" />}
              onClick={() => onRetry(task.filePath)}
              variant="ghost"
            >
              Reenfileirar
            </Button>
          )}
        </div>
      </div>

      {/* Barra de progresso e mensagem retornada pelo backend. */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <p className="text-text-secondary">{task.message}</p>
          <span className="font-mono text-xs text-text-muted">
            {task.progress !== null ? `${task.progress}%` : task.queuePosition ? `Fila ${task.queuePosition}` : '--'}
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-white/6">
          <div
            className="h-full rounded-full bg-gradient-to-r from-white via-white/80 to-white/50 transition-[width] duration-300"
            style={{ width: `${task.progress ?? (task.status === 'queued' ? 8 : 18)}%` }}
          />
        </div>
      </div>

      {task.status === 'completed' ? (
        <div className="space-y-2 border-t border-white/8 pt-4">
          <p className="text-sm font-medium text-text-secondary">Queimar legenda no vídeo</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { mode: 'zh' as const, label: 'Só chinês' },
                { mode: 'zh-en' as const, label: 'Chinês + inglês' },
                {
                  mode: 'zh-original' as const,
                  label: `Chinês + ${labelForLanguage(task.detectedLanguage ?? task.language)}`,
                },
              ]
            ).map(({ mode, label }) => {
              const job = task.hardsubJobs[mode]
              const isRunning = Boolean(job && job.status !== 'completed' && job.status !== 'error' && job.status !== 'cancelled')

              return (
                <div key={mode} className="flex items-center gap-2">
                  <Button onClick={() => onBurn(task.id, mode)} variant="ghost" disabled={isRunning}>
                    {isRunning && job ? `${label} (${job.progress ?? 0}%)` : label}
                  </Button>
                  {job?.status === 'completed' && job.outputPath ? (
                    <Button leadingIcon={<FolderSearch className="h-4 w-4" />} onClick={() => onOpenOutput(job.outputPath)} variant="ghost">
                      Abrir vídeo
                    </Button>
                  ) : null}
                  {job?.status === 'error' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-status-yellow">
                      <TriangleAlert className="h-3.5 w-3.5" />
                      {job.error}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Metadados tecnicos da tarefa exibidos em cards compactos. */}
      <div className="grid gap-3 text-sm text-text-secondary sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/8 bg-black/12 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Modelo</p>
          <p className="mt-1 font-medium text-text-primary">{task.model}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/12 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Idioma</p>
          <p className="mt-1 font-medium text-text-primary">{task.detectedLanguage ?? task.language}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/12 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Segmentos</p>
          <p className="mt-1 font-medium text-text-primary">
            {task.totalSegments ? `${task.processedSegments}/${task.totalSegments}` : task.processedSegments || '--'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/12 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Duração</p>
          <p className="mt-1 font-medium text-text-primary">{formatDuration(task.durationSec)}</p>
        </div>
      </div>

      {/* Rodape com horarios, erro final e indicador de processamento em tempo real. */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
        <span>Início: {formatTimestamp(task.startedAt)}</span>
        {task.completedAt ? <span>Fim: {formatTimestamp(task.completedAt)}</span> : null}
        {task.error ? (
          <span className="inline-flex items-center gap-1 text-status-red">
            <TriangleAlert className="h-3.5 w-3.5" />
            {task.error}
          </span>
        ) : null}
        {Object.entries(task.translationErrors).map(([lang, message]) => (
          <span key={lang} className="inline-flex items-center gap-1 text-status-yellow">
            <TriangleAlert className="h-3.5 w-3.5" />
            Traducao {lang} falhou: {message}
          </span>
        ))}
        {isActive ? (
          <span className="inline-flex items-center gap-1 text-status-yellow">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            Acompanhando progresso em tempo real
          </span>
        ) : null}
      </div>
    </Card>
  )
}
