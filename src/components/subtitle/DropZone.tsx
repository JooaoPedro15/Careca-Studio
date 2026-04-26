import { FolderOpen, UploadCloud } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface DropZoneProps {
  onPickFiles: () => Promise<{ ok: boolean; message: string | null }>
  onDropPaths: (paths: string[]) => Promise<{ ok: boolean; message: string | null }>
}

type DragFile = File & { path?: string }

export function DropZone({ onPickFiles, onDropPaths }: DropZoneProps) {
  // Controla o destaque visual da area de drop e mensagens de erro locais.
  const [isOver, setIsOver] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)

  // Resolve os caminhos reais dos arquivos arrastados antes de mandar para a fila.
  async function handleDrop(files: FileList | null) {
    if (!files) {
      return
    }

    const paths = Array.from(files)
      .map((file) => window.careca?.dialog?.getPathForFile(file) || (file as DragFile).path)
      .filter((path): path is string => Boolean(path))

    if (paths.length > 0) {
      const result = await onDropPaths(paths)
      setDropError(result.message)
    } else if (files.length > 0) {
      setDropError('Arrastar arquivo nao conseguiu expor o caminho nesta execucao. Use "Selecionar arquivos".')
    }

    setIsOver(false)
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-dashed p-8 transition duration-200',
        isOver ? 'border-white/30 bg-white/5' : 'border-white/10 bg-white/[0.03]',
      )}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        setIsOver(false)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setIsOver(true)
      }}
      onDrop={(event) => {
        event.preventDefault()
        void handleDrop(event.dataTransfer.files)
      }}
    >
      {/* Conteudo principal com CTA manual e feedback do arraste. */}
      <div className="relative flex flex-col items-start gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-white shadow-none">
          <UploadCloud className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-semibold text-text-primary">Jogue seus vídeos aqui</h3>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            Arraste arquivos de vídeo ou áudio para a fila do SubtitleForge. O app processa um por vez para
            preservar VRAM e manter o output consistente.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            leadingIcon={<FolderOpen className="h-4 w-4" />}
            onClick={() => {
              setDropError(null)
              void onPickFiles().then((result) => {
                setDropError(result.message)
              })
            }}
          >
            Selecionar arquivos
          </Button>
          <Button className="pointer-events-none text-text-secondary" tabIndex={-1} variant="ghost">
            MP4, MOV, MKV, MP3, WAV, M4A
          </Button>
        </div>

        {dropError ? <p className="text-sm text-amber-300">{dropError}</p> : null}
      </div>
    </div>
  )
}
