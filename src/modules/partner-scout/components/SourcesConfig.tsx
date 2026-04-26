import { ArrowLeft, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Toggle } from '@/components/ui/Toggle'
import { gameNicheList, nicheLabels } from '@/modules/partner-scout/data/niche-filters'
import type { SourcesConfig as SourcesConfigShape } from '@/modules/partner-scout/data/sources.config'
import { defaultSourcesConfig } from '@/modules/partner-scout/data/sources.config'

interface SourcesConfigProps {
  config: SourcesConfigShape
  onBack: () => void
  onChange: (updater: (current: SourcesConfigShape) => SourcesConfigShape) => void
}

function stringifyChannels(items: SourcesConfigShape['gameChannels']): string {
  return items.map((item) => `${item.name}|${item.handle}|${item.enabled ? '1' : '0'}`).join('\n')
}

function parseChannels(raw: string) {
  return raw
    .split('\n')
    .map((line, index) => {
      const [name, handle, enabled] = line.split('|').map((item) => item.trim())

      if (!name || !handle) {
        return null
      }

      return {
        id: `${name.toLowerCase().replaceAll(/\s+/g, '-')}-${index}`,
        name,
        handle,
        enabled: enabled !== '0',
      }
    })
    .filter((item): item is SourcesConfigShape['gameChannels'][number] => Boolean(item))
}

export function SourcesConfig({ config, onBack, onChange }: SourcesConfigProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button leadingIcon={<ArrowLeft className="h-4 w-4" />} variant="ghost" onClick={onBack}>
          Voltar ao dashboard
        </Button>
        <Button leadingIcon={<RotateCcw className="h-4 w-4" />} variant="ghost" onClick={() => onChange(() => defaultSourcesConfig)}>
          Restaurar fontes padrao
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Radar de mercado</p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              Aqui entram creators de referencia do seu mercado. O app usa esses nomes para detectar publis recentes em canais parecidos com o seu.
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-primary">Creators de referencia games</span>
            <textarea
              className="min-h-[180px] w-full rounded-2xl border border-white/10 bg-black/16 px-4 py-3 text-white outline-none transition focus:border-white/30"
              value={stringifyChannels(config.gameChannels)}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  gameChannels: parseChannels(event.target.value),
                }))
              }
            />
            <p className="text-xs text-text-muted">Formato: Nome|@handle|1 para ligado ou 0 para desligado.</p>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-text-primary">Frequencia</span>
            <select
              className="w-full rounded-2xl border border-white/10 bg-black/16 px-4 py-3 text-white outline-none transition focus:border-white/30"
              value={config.frequency}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  frequency: event.target.value as SourcesConfigShape['frequency'],
                }))
              }
            >
              <option value="daily-6h">1x por dia as 6h</option>
              <option value="every-3-days">1x a cada 3 dias</option>
            </select>
          </label>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Subnichos games ativos</p>
          <div className="mt-5 space-y-4">
            {gameNicheList.map((niche) => (
              <div key={niche} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/16 px-4 py-4">
                <div>
                  <p className="font-medium text-text-primary">{nicheLabels[niche]}</p>
                  <p className="mt-1 text-sm text-text-secondary">Controla se o scheduler aceita esse subnicho.</p>
                </div>
                <Toggle
                  checked={config.nicheToggles[niche]}
                  onChange={(checked) =>
                    onChange((current) => ({
                      ...current,
                      nicheToggles: {
                        ...current.nicheToggles,
                        [niche]: checked,
                      },
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
