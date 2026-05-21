import { BookOpenText, Clapperboard, Film, Radar } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { ToolId } from '@/types/subtitle'

interface SidebarProps {
  activeTool: ToolId
  onSelect: (tool: ToolId) => void
}

function CarecaIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 9.5 Q12 6.5 16.5 9.5" />
    </svg>
  )
}

const tools = [
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
  {
    id: 'media-kit' as const,
    name: 'Media Kit',
    description: 'Deck comercial',
    icon: BookOpenText,
    badge: 'Live',
  },
  {
    id: 'partner-scout' as const,
    name: 'Partner Scout',
    description: 'Radar de leads',
    icon: Radar,
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
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
          <CarecaIcon className="h-6 w-6" />
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-text-muted">Careca</p>
          <h1 className="text-xl font-semibold text-text-primary">Studio</h1>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {tools.map((tool) => {
          const Icon = tool.icon
          const isActive = tool.id === activeTool

          return (
            <button
              key={tool.id}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'app-no-drag flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left transition duration-200',
                isActive
                  ? 'border-white/20 bg-white/8 text-white shadow-none'
                  : 'border-transparent bg-transparent text-text-secondary hover:border-white/8 hover:bg-white/4 hover:text-text-primary',
              )}
              onClick={() => onSelect(tool.id)}
              type="button"
            >
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
                  <p className="truncate font-medium">{tool.name}</p>
                  <Badge tone={tool.badge === 'Live' ? 'green' : 'blue'}>{tool.badge}</Badge>
                </div>
                <p className="truncate text-sm text-text-secondary">{tool.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-auto rounded-xl border border-white/8 bg-white/4 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Roadmap</p>
        <p className="mt-2 text-sm text-text-secondary">
          Media Kit e Partner Scout agora vivem no mesmo shell do SubtitleForge.
        </p>
      </div>
    </aside>
  )
}
