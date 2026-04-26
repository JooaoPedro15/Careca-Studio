import { CheckCheck, Clock3, Cpu, ListTodo } from 'lucide-react'

import { StatCard } from '@/components/ui/StatCard'
import { formatDuration } from '@/lib/utils'
import type { SubtitleTask } from '@/types/subtitle'

interface StatsBarProps {
  tasks: SubtitleTask[]
}

export function StatsBar({ tasks }: StatsBarProps) {
  // Deriva indicadores rapidos para o topo da pagina a partir da lista de tarefas.
  const queued = tasks.filter((task) => task.status === 'queued').length
  const completed = tasks.filter((task) => task.status === 'completed')
  const activeTask = tasks.find((task) => task.status === 'processing' || task.status === 'preparing')
  const averageDuration =
    completed.length > 0
      ? completed.reduce((total, task) => total + (task.durationSec ?? 0), 0) / completed.length
      : null

  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
      {/* Cada StatCard destaca um aspecto operacional importante da sessao atual. */}
      <StatCard
        hint={activeTask ? `Ativa: ${activeTask.fileName}` : 'Pronto para receber novos arquivos'}
        icon={<Cpu className="h-4 w-4" />}
        label="Processamento"
        value={activeTask ? (activeTask.device === 'cpu' ? 'CPU' : 'GPU') : 'Idle'}
      />
      <StatCard
        hint="Controle a fila para evitar gargalo de VRAM"
        icon={<ListTodo className="h-4 w-4" />}
        label="Na fila"
        value={queued.toString().padStart(2, '0')}
      />
      <StatCard
        hint="Média real das transcrições concluídas nesta sessão"
        icon={<Clock3 className="h-4 w-4" />}
        label="Tempo médio"
        value={formatDuration(averageDuration)}
      />
      <StatCard
        hint="Tasks finalizadas com sucesso"
        icon={<CheckCheck className="h-4 w-4" />}
        label="Concluídas"
        value={completed.length.toString().padStart(2, '0')}
      />
    </div>
  )
}
