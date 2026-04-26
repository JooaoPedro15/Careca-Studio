import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type BadgeTone = 'green' | 'yellow' | 'blue' | 'red' | 'neutral'

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

// Cada tom aponta para um conjunto de classes reutilizado pelo app inteiro.
const toneClasses: Record<BadgeTone, string> = {
  green: 'bg-status-green/12 text-status-green ring-status-green/25',
  yellow: 'bg-status-yellow/12 text-status-yellow ring-status-yellow/25',
  blue: 'bg-status-blue/12 text-status-blue ring-status-blue/25',
  red: 'bg-status-red/12 text-status-red ring-status-red/25',
  neutral: 'bg-white/6 text-text-secondary ring-white/10',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    // Badge compacto para status, modos e labels auxiliares.
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ring-1',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
