import { useRef, useState } from 'react'
import { ArrowLeft, Download, ImagePlus, RotateCcw } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FieldInput } from '@/modules/media-kit/components/FieldInput'
import { ExternalSlidePreview } from '@/modules/media-kit/components/ExternalSlidePreview'
import type {
  ExternalMediaKitSlide,
  MediaKitData,
} from '@/modules/media-kit/data/mediakit.schema'
import {
  exportExternalSlideAsPng,
  fileToDataUrl,
  getImageSize,
} from '@/modules/media-kit/services/external-slide.service'

interface ExternalSlideEditorProps {
  data: MediaKitData
  onBack: () => void
  onChange: (updater: (current: MediaKitData) => MediaKitData) => void
  onReset: () => void
}

export function ExternalSlideEditor({ data, onBack, onChange, onReset }: ExternalSlideEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string>(data.externalSlide.blocks[0]?.id ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const selectedBlock =
    data.externalSlide.blocks.find((block) => block.id === selectedBlockId) ?? data.externalSlide.blocks[0] ?? null

  async function handleImportFile(file: File) {
    const dataUrl = await fileToDataUrl(file)
    const size = await getImageSize(dataUrl)

    onChange((current) => ({
      ...current,
      externalSlide: {
        ...current.externalSlide,
        backgroundImage: dataUrl,
        fileName: file.name,
        updatedAt: new Date().toISOString(),
        canvas: size,
      },
    }))
  }

  function patchSelectedBlock(updater: (block: ExternalMediaKitSlide['blocks'][number]) => ExternalMediaKitSlide['blocks'][number]) {
    if (!selectedBlock) {
      return
    }

    onChange((current) => ({
      ...current,
      externalSlide: {
        ...current.externalSlide,
        updatedAt: new Date().toISOString(),
        blocks: current.externalSlide.blocks.map((block) => (block.id === selectedBlock.id ? updater(block) : block)),
      },
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button leadingIcon={<ArrowLeft className="h-4 w-4" />} variant="ghost" onClick={onBack}>
          Voltar ao dashboard
        </Button>
        <div className="flex flex-wrap gap-3">
          <Button leadingIcon={<ImagePlus className="h-4 w-4" />} variant="ghost" onClick={() => inputRef.current?.click()}>
            Importar slide externo
          </Button>
          <Button leadingIcon={<Download className="h-4 w-4" />} onClick={() => exportExternalSlideAsPng(data.externalSlide)}>
            Exportar PNG
          </Button>
          <Button leadingIcon={<RotateCcw className="h-4 w-4" />} variant="ghost" onClick={onReset}>
            Restaurar defaults
          </Button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0]

          if (!file) {
            return
          }

          await handleImportFile(file)
          event.target.value = ''
        }}
      />

      <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Arquivo atual</p>
            <p className="mt-2 text-sm text-text-primary">{data.externalSlide.fileName ?? 'Nenhum slide importado ainda'}</p>
            <p className="mt-2 text-xs text-text-secondary">
              Fluxo pensado para quando voce ja tem a arte do slide pronta fora do app e so quer editar por dentro.
            </p>
          </div>

          <div className="space-y-2">
            {data.externalSlide.blocks.map((block) => (
              <button
                key={block.id}
                type="button"
                onClick={() => setSelectedBlockId(block.id)}
                className={
                  block.id === selectedBlock?.id
                    ? 'w-full rounded-2xl border border-white/18 bg-white/8 px-4 py-3 text-left'
                    : 'w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:bg-white/7'
                }
              >
                <p className="font-medium text-text-primary">{block.label}</p>
                <p className="mt-1 line-clamp-2 text-sm text-text-secondary">{block.text}</p>
              </button>
            ))}
          </div>

          {selectedBlock ? (
            <div className="space-y-4">
              <FieldInput
                label="Texto"
                type="textarea"
                value={selectedBlock.text}
                onChange={(value) => patchSelectedBlock((block) => ({ ...block, text: value }))}
              />
              <FieldInput
                label="Largura do bloco"
                type="number"
                value={selectedBlock.width}
                onChange={(value) => patchSelectedBlock((block) => ({ ...block, width: Number(value) }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label="Posicao X"
                  type="number"
                  value={selectedBlock.x}
                  onChange={(value) => patchSelectedBlock((block) => ({ ...block, x: Number(value) }))}
                />
                <FieldInput
                  label="Posicao Y"
                  type="number"
                  value={selectedBlock.y}
                  onChange={(value) => patchSelectedBlock((block) => ({ ...block, y: Number(value) }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput
                  label="Fonte"
                  type="number"
                  value={selectedBlock.fontSize}
                  onChange={(value) => patchSelectedBlock((block) => ({ ...block, fontSize: Number(value) }))}
                />
                <FieldInput
                  label="Peso"
                  type="number"
                  value={selectedBlock.fontWeight}
                  onChange={(value) => patchSelectedBlock((block) => ({ ...block, fontWeight: Number(value) }))}
                />
              </div>
              <FieldInput
                label="Cor"
                value={selectedBlock.color}
                onChange={(value) => patchSelectedBlock((block) => ({ ...block, color: value }))}
              />
              <FieldInput
                label="Alinhamento"
                type="select"
                value={selectedBlock.align}
                options={[
                  { label: 'Esquerda', value: 'left' },
                  { label: 'Centro', value: 'center' },
                  { label: 'Direita', value: 'right' },
                ]}
                onChange={(value) => patchSelectedBlock((block) => ({ ...block, align: value as typeof block.align }))}
              />
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Preview do slide externo</p>
              <p className="mt-2 text-sm text-text-secondary">
                A imagem entra como base e os blocos editaveis ficam por cima.
              </p>
            </div>
          </div>

          <ExternalSlidePreview
            slide={data.externalSlide}
            selectedBlockId={selectedBlock?.id ?? null}
            onSelectBlock={setSelectedBlockId}
          />
        </Card>
      </div>
    </div>
  )
}
