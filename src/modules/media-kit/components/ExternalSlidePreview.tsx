import { cn } from '@/lib/utils'
import type { ExternalMediaKitSlide } from '@/modules/media-kit/data/mediakit.schema'

interface ExternalSlidePreviewProps {
  slide: ExternalMediaKitSlide
  selectedBlockId?: string | null
  compact?: boolean
  onSelectBlock?: (blockId: string) => void
}

export function ExternalSlidePreview({
  slide,
  selectedBlockId = null,
  compact = false,
  onSelectBlock,
}: ExternalSlidePreviewProps) {
  const baseWidth = slide.canvas.width || 1920
  const baseHeight = slide.canvas.height || 1080

  return (
    <div
      className="relative w-full overflow-hidden rounded-[28px] border border-white/8 bg-black"
      style={{ aspectRatio: `${baseWidth} / ${baseHeight}` }}
    >
      {slide.backgroundImage ? (
        <img alt="Slide externo" className="absolute inset-0 h-full w-full object-cover" src={slide.backgroundImage} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.26em] text-text-muted">Slide externo</p>
            <p className="mt-3 text-sm text-text-secondary">Importe um PNG, JPG ou WebP para editar aqui.</p>
          </div>
        </div>
      )}

      <div className="absolute inset-0">
        {slide.blocks.map((block) => (
          <button
            key={block.id}
            type="button"
            onClick={() => onSelectBlock?.(block.id)}
            className={cn(
              'absolute rounded-xl border border-transparent px-2 py-1 text-left transition',
              onSelectBlock ? 'cursor-pointer hover:border-white/30 hover:bg-black/10' : 'cursor-default',
              selectedBlockId === block.id && 'border-white/40 bg-black/15',
            )}
            style={{
              left: `${(block.x / baseWidth) * 100}%`,
              top: `${(block.y / baseHeight) * 100}%`,
              width: `${(block.width / baseWidth) * 100}%`,
              color: block.color,
              fontSize: compact ? `${Math.max(10, block.fontSize / 2.8)}px` : `${Math.max(12, block.fontSize / 1.8)}px`,
              fontWeight: block.fontWeight,
              textAlign: block.align,
              lineHeight: 1.24,
            }}
          >
            <span className="whitespace-pre-wrap">{block.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

