import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  leadingIcon?: ReactNode
}

// Mapa central de variantes para manter consistencia visual entre botoes.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-white text-black shadow-[0_8px_20px_rgba(255,255,255,0.08)] hover:bg-white/90 disabled:bg-white/40',
  ghost:
    'border border-white/10 bg-white/4 text-text-primary hover:border-white/20 hover:bg-white/8 disabled:opacity-50',
  danger:
    'border border-status-red/30 bg-status-red/12 text-status-red hover:bg-status-red/18 disabled:opacity-50',
}

export function Button({
  className,
  children,
  leadingIcon,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    // Botao base compartilhado entre a navegacao e os cards operacionais.
    <button
      className={cn(
        'app-no-drag inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-white/25 disabled:cursor-not-allowed',
        variantClasses[variant],
        className,
      )}
      type={type}
      {...props}
    >
      {leadingIcon}
      <span>{children}</span>
    </button>
  )
}
