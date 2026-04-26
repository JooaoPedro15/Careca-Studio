import { cn } from '@/lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    // Switch visual simples que delega o estado real para o componente pai.
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-[22px] w-[40px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
        checked ? 'bg-white' : 'bg-white/10',
        disabled && 'cursor-not-allowed opacity-50',
      )}
      onClick={() => onChange(!checked)}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-[16px] w-[16px] rounded-full transition-transform duration-200',
          checked ? 'translate-x-[21px] bg-black' : 'translate-x-[3px] bg-white/50',
        )}
      />
    </button>
  )
}
