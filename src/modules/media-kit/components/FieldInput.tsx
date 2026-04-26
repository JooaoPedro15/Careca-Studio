import { cn } from '@/lib/utils'

type FieldInputType = 'text' | 'textarea' | 'number' | 'select' | 'tags'

interface FieldInputProps {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: FieldInputType
  hint?: string
  options?: Array<{ label: string; value: string }>
}

export function FieldInput({ label, value, onChange, type = 'text', hint, options = [] }: FieldInputProps) {
  const baseClassName =
    'w-full rounded-2xl border border-white/10 bg-black/16 px-4 py-3 text-white outline-none transition focus:border-white/30'

  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
      </div>

      {type === 'textarea' || type === 'tags' ? (
        <textarea
          className={cn(baseClassName, 'min-h-[110px] resize-y')}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {type === 'number' ? (
        <input
          className={baseClassName}
          type="number"
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {type === 'select' ? (
        <select className={baseClassName} value={String(value)} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}

      {type === 'text' ? (
        <input className={baseClassName} type="text" value={String(value)} onChange={(event) => onChange(event.target.value)} />
      ) : null}

      {type === 'tags' ? <p className="text-xs text-text-muted">Use uma linha por item.</p> : null}
    </label>
  )
}

