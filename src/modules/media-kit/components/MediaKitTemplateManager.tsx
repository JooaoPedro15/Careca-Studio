import { ArrowLeft, Check } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type {
  MediaKitTemplate,
  MediaKitTemplateDefinition,
} from '@/modules/media-kit/data/mediakit.schema'

interface MediaKitTemplateManagerProps {
  templates: MediaKitTemplateDefinition[]
  activeTemplate: MediaKitTemplate
  onBack: () => void
  onSelect: (template: MediaKitTemplate) => void
}

export function MediaKitTemplateManager({
  templates,
  activeTemplate,
  onBack,
  onSelect,
}: MediaKitTemplateManagerProps) {
  return (
    <div className="space-y-6">
      <Button leadingIcon={<ArrowLeft className="h-4 w-4" />} variant="ghost" onClick={onBack}>
        Voltar ao dashboard
      </Button>

      <div className="grid gap-5 xl:grid-cols-3">
        {templates.map((template) => {
          const active = template.id === activeTemplate

          return (
            <Card
              key={template.id}
              className={
                active
                  ? 'border-white/18 bg-[radial-gradient(circle_at_top_left,rgba(138,180,255,0.15),transparent_34%),rgba(255,255,255,0.03)]'
                  : undefined
              }
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-text-muted">Template</p>
                    <h3 className="mt-3 text-2xl font-semibold text-text-primary">{template.label}</h3>
                  </div>
                  {active ? <Check className="h-5 w-5 text-white" /> : null}
                </div>

                <p className="mt-4 text-sm leading-7 text-text-secondary">{template.description}</p>

                <div className="mt-5 rounded-2xl border border-white/8 bg-black/16 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Foco</p>
                  <p className="mt-2 text-sm leading-6 text-text-primary">{template.focus}</p>
                </div>

                <div className="mt-4 rounded-2xl border border-white/8 bg-black/16 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Slides inclusos</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.includedSlides.map((slideId) => (
                      <span
                        key={slideId}
                        className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-text-primary"
                      >
                        {slideId}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-5">
                  <Button variant={active ? 'primary' : 'ghost'} onClick={() => onSelect(template.id)}>
                    {active ? 'Template ativo' : 'Ativar template'}
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

