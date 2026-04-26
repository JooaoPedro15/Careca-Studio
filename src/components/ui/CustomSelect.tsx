import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  className?: string
}

export function CustomSelect({ value, onChange, options, className }: CustomSelectProps) {
  // Controla a abertura do dropdown e referencia o container para clique externo.
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Recupera a opcao selecionada para mostrar o label amigavel no botao.
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    // Fecha o menu quando o usuario clica fora do componente.
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Botao principal que abre/fecha a lista de opcoes. */}
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/16 px-4 py-3 text-left text-white outline-none transition focus:border-white/30"
        onClick={() => setOpen(!open)}
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-white/50 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {open && (
        // Lista flutuante com as opcoes disponiveis para este campo.
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                'flex w-full items-center px-4 py-2.5 text-left text-sm transition',
                option.value === value
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white',
              )}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
