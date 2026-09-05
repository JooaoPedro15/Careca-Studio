import { Clapperboard, Film } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { ToolId } from '@/types/subtitle'

interface SidebarProps {
  activeTool: ToolId
  onSelect: (tool: ToolId) => void
}

function ClipForgeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect height="10.5" rx="2" width="13" x="4.5" y="7.5" />
      <path d="M4.5 11h13" />
      <path d="M7 7.5 9.25 11M11 7.5 13.25 11M15 7.5 17.25 11" />
      <path d="m10.5 13.25 3 1.75-3 1.75Z" fill="currentColor" stroke="none" />
      <path d="M19.25 4.25v2M18.25 5.25h2M18.6 4.6l1.3 1.3M19.9 4.6l-1.3 1.3" />
    </svg>
  )
}

export const tools = [
  {
    id: 'subtitle-forge' as const,
    name: 'SubtitleForge',
    description: 'Legendas com IA',
    icon: Clapperboard,
    badge: 'Live',
  },
  {
    id: 'clip-splitter' as const,
    name: 'Pre-Editor',
    description: 'Limpa o bruto',
    icon: Film,
    badge: 'New',
  },
] satisfies Array<{
  id: ToolId
  name: string
  description: string
  icon: typeof Clapperboard
  badge: string
}>

export function Sidebar({ activeTool, onSelect }: SidebarProps) {
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/8 bg-dark/92 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
      <div className="app-drag flex items-center gap-3 rounded-xl border border-white/6 bg-white/3 px-4 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black">
          <ClipForgeIcon className="h-5 w-5" />
        </div>

        <div>
          <h1 className="text-lg font-semibold leading-tight text-text-primary">ClipForge</h1>
          <p className="text-xs text-text-muted">Bancada de edição</p>
        </div>
      </div>

      <div className="mt-6 space-y-1.5">
        {tools.map((tool) => {
          const Icon = tool.icon
          const isActive = tool.id === activeTool

          return (
            <button
              key={tool.id}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'app-no-drag relative flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left transition duration-200',
                isActive
                  ? 'border-white/20 bg-white/8 text-white shadow-none'
                  : 'border-transparent bg-transparent text-text-secondary hover:border-white/8 hover:bg-white/4 hover:text-text-primary',
              )}
              onClick={() => onSelect(tool.id)}
              type="button"
            >
              {isActive ? (
                <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[3px] rounded-full bg-white" />
              ) : null}
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-2xl',
                  isActive ? 'bg-white/12 text-white' : 'bg-white/5 text-text-secondary',
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn('truncate font-medium', isActive ? 'text-white' : 'text-text-primary')}>
                    {tool.name}
                  </p>
                  <Badge tone={tool.badge === 'Live' ? 'green' : 'blue'}>{tool.badge}</Badge>
                </div>
                <p className="truncate text-sm text-text-secondary">{tool.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-auto rounded-xl border border-white/8 bg-white/4 p-4">
        <p className="text-sm font-medium text-text-primary">Roadmap</p>
        <p className="mt-1.5 text-sm leading-6 text-text-secondary">
          O ClipForge agora foca em ferramentas de edição para acelerar cortes e legendas.
        </p>
      </div>
    </aside>
  )
}
