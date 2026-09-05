import { Minus, Square, X } from 'lucide-react'

import { hasClipForgeDesktopBridge } from '@/lib/utils'

interface TopbarProps {
  title: string
  description: string
}

export function Topbar({ title, description }: TopbarProps) {
  // Descobre se os controles da janela podem chamar o preload do Electron.
  const hasDesktopBridge = hasClipForgeDesktopBridge()

  return (
    <header className="app-drag flex items-start justify-between gap-6 rounded-2xl border border-white/8 bg-dark/82 px-6 py-5 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
      {/* Bloco textual com contexto da ferramenta aberta. */}
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">{title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-text-secondary">{description}</p>
        {!hasDesktopBridge ? (
          <p className="mt-3 text-sm text-amber-300">
            Controles da janela indisponiveis aqui. Abra o app com <code>npm.cmd run electron:dev</code>.
          </p>
        ) : null}
      </div>

      {/* Controles nativos da janela quando o app esta rodando via Electron. */}
      <div className="app-no-drag flex items-center gap-2">
        <button
          aria-label="Minimizar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-text-secondary transition hover:bg-white/10 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!hasDesktopBridge}
          onClick={() => void window.clipforge?.window?.minimize()}
          type="button"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          aria-label="Maximizar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-text-secondary transition hover:bg-white/10 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!hasDesktopBridge}
          onClick={() => void window.clipforge?.window?.maximize()}
          type="button"
        >
          <Square className="h-4 w-4" />
        </button>
        <button
          aria-label="Fechar"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-status-red/20 bg-status-red/10 text-status-red transition hover:bg-status-red/18 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!hasDesktopBridge}
          onClick={() => void window.clipforge?.window?.close()}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
