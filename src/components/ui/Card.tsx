import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    // Container visual padrao usado para agrupar blocos de informacao.
    <div
      className={cn(
        'rounded-2xl border border-white/8 bg-surface/92 p-5 shadow-[0_4px_16px_rgba(0,0,0,0.3)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
