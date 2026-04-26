import { Drama, FlameKindling } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

export function ReactScoutPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
      {/* Card principal reservando o espaco visual da ferramenta futura. */}
      <Card className="overflow-hidden bg-gradient-to-br from-status-yellow/10 via-transparent to-transparent">
        <div className="space-y-5">
          <Badge tone="yellow">Planejado</Badge>
          <div>
            <h3 className="text-3xl font-semibold text-text-primary">React Scout vai entrar aqui</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
              O espaço já está reservado para descobrir animes, séries e assuntos quentes com potencial de reação.
              Quando a fase chegar, o app já tem navegação, cards e estrutura para acomodar a experiência.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/14 p-5">
              <Drama className="h-5 w-5 text-status-yellow" />
              <h4 className="mt-4 text-lg font-medium text-text-primary">Radar de temporada</h4>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Descoberta de episódios, trailers e virais para reacts rápidos.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/14 p-5">
              <FlameKindling className="h-5 w-5 text-status-yellow" />
              <h4 className="mt-4 text-lg font-medium text-text-primary">Heat score</h4>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Combinação de engajamento, timing e apelo para thumbnail/título.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Card complementar explicando a meta de uso dessa area. */}
      <Card className="flex flex-col justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Design Goal</p>
          <p className="mt-4 text-lg leading-8 text-text-primary">
            Uma mesa de pesquisa rápida para decidir “vale react hoje?” sem abrir dez abas.
          </p>
        </div>

        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-sm text-text-secondary">
            Enquanto isso, o SubtitleForge já roda como ferramenta principal deste workspace.
          </p>
        </div>
      </Card>
    </div>
  )
}
