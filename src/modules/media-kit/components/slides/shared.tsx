import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type {
  AcceptedNiche,
  CommercialChannel,
  FieldSource,
  MediaKitTemplate,
} from '@/modules/media-kit/data/mediakit.schema'

const nicheLabels: Record<AcceptedNiche, string> = {
  aaa: 'AAA',
  indie: 'Indie',
  mobile: 'Mobile',
  plataforma_gaming: 'Plataforma gaming',
  energetico_snack: 'Energetico/snack',
  streaming: 'Streaming',
  anime: 'Anime',
  plataforma_video: 'Plataforma de video',
}

const channelLabels: Record<CommercialChannel, string> = {
  main: 'Canal principal',
  react: 'TikTok react',
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`
  }

  return value.toString()
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatRelativeDays(dateLike: string): string {
  const source = new Date(dateLike)
  const now = new Date()
  const diff = Math.max(0, Math.floor((now.getTime() - source.getTime()) / (1000 * 60 * 60 * 24)))

  if (diff === 0) {
    return 'hoje'
  }

  if (diff === 1) {
    return 'ha 1 dia'
  }

  return `ha ${diff} dias`
}

export function getChannelLabel(channel: CommercialChannel): string {
  return channelLabels[channel]
}

export function getNicheLabel(niche: AcceptedNiche): string {
  return nicheLabels[niche]
}

export function getTemplateLabel(template: MediaKitTemplate): string {
  if (template === 'games') {
    return 'Kit games'
  }

  if (template === 'streaming') {
    return 'Kit streaming/anime'
  }

  return 'Kit completo'
}

export function getFieldSourceBadge(source: FieldSource): { label: string; tone: 'blue' | 'yellow' | 'green' } {
  if (source === 'auto') {
    return { label: 'Auto', tone: 'blue' }
  }

  if (source === 'integrated') {
    return { label: 'Integrado', tone: 'green' }
  }

  return { label: 'Manual', tone: 'yellow' }
}

export function SlideShell({
  eyebrow,
  title,
  subtitle,
  compact = false,
  children,
  footer,
}: {
  eyebrow: string
  title: string
  subtitle: string
  compact?: boolean
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex h-full flex-col rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(138,180,255,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-text-muted">{eyebrow}</p>
          <h3 className={cn('mt-2 font-semibold text-text-primary', compact ? 'text-xl' : 'text-3xl')}>{title}</h3>
          <p className={cn('mt-2 max-w-3xl text-text-secondary', compact ? 'text-xs leading-5' : 'text-sm leading-7')}>
            {subtitle}
          </p>
        </div>
        <Badge tone="neutral">{compact ? 'Preview' : 'Live'}</Badge>
      </div>

      <div className={cn('mt-5 flex-1', compact ? 'space-y-3' : 'space-y-5')}>{children}</div>
      {footer ? <div className="mt-5 border-t border-white/8 pt-4">{footer}</div> : null}
    </div>
  )
}

export function MetricPill({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.25em] text-text-muted">{label}</p>
      <p className={cn('mt-2 font-semibold text-text-primary', compact ? 'text-lg' : 'text-2xl')}>{value}</p>
    </div>
  )
}

export function PlaceholderThumb({
  label,
  meta,
  compact = false,
}: {
  label: string
  meta: string
  compact?: boolean
}) {
  return (
    <div className="flex h-full min-h-[88px] flex-col justify-end rounded-2xl border border-white/8 bg-[linear-gradient(135deg,rgba(138,180,255,0.22),rgba(255,255,255,0.03))] p-3">
      <p className={cn('font-medium text-text-primary', compact ? 'text-sm' : 'text-base')}>{label}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-secondary">{meta}</p>
    </div>
  )
}

export function BarRow({
  label,
  value,
  compact = false,
}: {
  label: string
  value: number
  compact?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-text-secondary">
        <span className={compact ? 'text-xs' : 'text-sm'}>{label}</span>
        <span className="text-xs">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/8">
        <div className="h-2 rounded-full bg-white" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-white/8 bg-white/6 px-3 py-1.5 text-xs text-text-primary">
          {item}
        </span>
      ))}
    </div>
  )
}

