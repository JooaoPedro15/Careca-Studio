import { ListChecks } from 'lucide-react'

import { TaskItem } from '@/components/subtitle/TaskItem'
import { Card } from '@/components/ui/Card'
import type { HardsubMode, SubtitleTask } from '@/types/subtitle'

interface TaskListProps {
  tasks: SubtitleTask[]
  onCancel: (taskId: string) => void
  onOpenOutput: (outputPath: string | null) => void
  onRetry: (filePath: string) => void
  onBurn: (taskId: string, mode: HardsubMode) => void
}

export function TaskList({ tasks, onCancel, onOpenOutput, onRetry, onBurn }: TaskListProps) {
  // Estado vazio exibido antes da primeira tarefa entrar na fila.
  if (tasks.length === 0) {
    return (
      <Card className="flex min-h-[240px] items-center justify-center border-dashed bg-white/[0.03]">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/6 text-text-secondary">
            <ListChecks className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium text-text-primary">Fila vazia por enquanto</h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            Assim que você soltar um arquivo ou escolher pelo explorador, as tarefas aparecem aqui com progresso,
            logs e ações rápidas.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Renderiza um card por tarefa para acompanhar progresso e acoes rapidas. */}
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          onBurn={onBurn}
          onCancel={onCancel}
          onOpenOutput={onOpenOutput}
          onRetry={onRetry}
          task={task}
        />
      ))}
    </div>
  )
}
