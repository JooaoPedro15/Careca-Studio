import { Radar, Swords } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

export function GameScoutPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      {/* Card principal descrevendo a visao futura da ferramenta. */}
      <Card className="overflow-hidden bg-gradient-to-br from-status-blue/10 via-transparent to-transparent">
        <div className="space-y-5">
          <Badge tone="blue">Em breve</Badge>
          <div>
            <h3 className="text-3xl font-semibold text-text-primary">Game Scout está no radar</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              A próxima etapa vai puxar sinais de jogos em alta, cruzar volume, novidade e potencial de corte para
              shorts. O shell já está pronto para receber essa ferramenta quando a coleta entrar.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/14 p-5">
              <Radar className="h-5 w-5 text-status-blue" />
              <h4 className="mt-4 text-lg font-medium text-text-primary">Trend Signals</h4>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Surface de tendências por lançamento, pico de stream e volume de busca.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/14 p-5">
              <Swords className="h-5 w-5 text-status-blue" />
              <h4 className="mt-4 text-lg font-medium text-text-primary">Hook Angle</h4>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Sugestão de gancho para reacts, rankings e cortes de gameplay.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Coluna lateral com o pipeline imaginado para a feature. */}
      <Card>
        <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Pipeline</p>
        <div className="mt-5 space-y-4">
          {['Coleta de tendências', 'Cluster de temas', 'Sugestão de pauta'].map((item, index) => (
            <div key={item} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Step {index + 1}</p>
              <p className="mt-2 text-text-primary">{item}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
