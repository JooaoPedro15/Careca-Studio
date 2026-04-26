import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, FilePenLine, FolderOpen, RefreshCw, Save } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FieldInput } from '@/modules/media-kit/components/FieldInput'
import type { MediaKitData } from '@/modules/media-kit/data/mediakit.schema'
import type { PptxDeck, PptxSlide, PptxTextUpdate } from '@/types/pptx'

interface PptxNativeEditorProps {
  data: MediaKitData
  onBack: () => void
  onChange: (updater: (current: MediaKitData) => MediaKitData) => void
}

function toDraftKey(slideIndex: number, shapeName: string): string {
  return `${slideIndex}:${shapeName}`
}

function formatDateTime(dateLike: string | null): string {
  if (!dateLike) {
    return '--'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateLike))
}

export function PptxNativeEditor({ data, onBack, onChange }: PptxNativeEditorProps) {
  const [deck, setDeck] = useState<PptxDeck | null>(null)
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(1)
  const [draftValues, setDraftValues] = useState<Record<string, string>>({})
  const [statusMessage, setStatusMessage] = useState<string>('Importe um arquivo .pptx para comecar.')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  async function inspectDeck(filePath: string) {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const nextDeck = await window.careca.pptx.inspect(filePath)
      setDeck(nextDeck)
      setSelectedSlideIndex(nextDeck.slides[0]?.slideIndex ?? 1)
      setDraftValues(
        Object.fromEntries(
          nextDeck.slides.flatMap((slide) =>
            slide.textShapes.map((shape) => [toDraftKey(slide.slideIndex, shape.shapeName), shape.text]),
          ),
        ),
      )
      setStatusMessage(`${nextDeck.fileName} carregado com ${nextDeck.slideCount} slide(s).`)
      onChange((current) => ({
        ...current,
        nativePptx: {
          filePath: nextDeck.filePath,
          lastSyncedAt: new Date().toISOString(),
        },
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao abrir o arquivo PPTX.'
      setErrorMessage(message)
      setStatusMessage('Nao foi possivel abrir o PPTX nativo.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (data.nativePptx.filePath && !deck && !isLoading) {
      void inspectDeck(data.nativePptx.filePath)
    }
  }, [data.nativePptx.filePath])

  const selectedSlide = useMemo(() => {
    return deck?.slides.find((slide) => slide.slideIndex === selectedSlideIndex) ?? deck?.slides[0] ?? null
  }, [deck, selectedSlideIndex])

  async function handlePickPptx() {
    const files = await window.careca.dialog.openFiles([{ name: 'PowerPoint', extensions: ['pptx'] }])
    const filePath = files[0]

    if (!filePath) {
      return
    }

    await inspectDeck(filePath)
  }

  async function handleSaveSelectedSlide() {
    if (!deck || !selectedSlide) {
      return
    }

    const updates: PptxTextUpdate[] = selectedSlide.textShapes.map((shape) => ({
      slideIndex: selectedSlide.slideIndex,
      shapeName: shape.shapeName,
      text: draftValues[toDraftKey(selectedSlide.slideIndex, shape.shapeName)] ?? shape.text,
    }))

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const nextDeck = await window.careca.pptx.updateText(deck.filePath, updates)
      setDeck(nextDeck)
      setStatusMessage(`Slide ${selectedSlide.slideIndex} salvo no arquivo PPTX real.`)
      onChange((current) => ({
        ...current,
        nativePptx: {
          filePath: nextDeck.filePath,
          lastSyncedAt: new Date().toISOString(),
        },
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar o PPTX.'
      setErrorMessage(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button leadingIcon={<ArrowLeft className="h-4 w-4" />} variant="ghost" onClick={onBack}>
          Voltar ao dashboard
        </Button>
        <div className="flex flex-wrap gap-3">
          <Button leadingIcon={<FilePenLine className="h-4 w-4" />} variant="ghost" onClick={handlePickPptx} disabled={isLoading}>
            Escolher PPTX
          </Button>
          <Button
            leadingIcon={<RefreshCw className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />}
            variant="ghost"
            onClick={() => {
              if (deck?.filePath) {
                void inspectDeck(deck.filePath)
              }
            }}
            disabled={!deck || isLoading}
          >
            Recarregar
          </Button>
          <Button leadingIcon={<Save className="h-4 w-4" />} onClick={handleSaveSelectedSlide} disabled={!selectedSlide || isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar slide'}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="space-y-4">
          <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Arquivo nativo</p>
            <p className="mt-2 break-all text-sm text-text-primary">{deck?.filePath ?? data.nativePptx.filePath ?? 'Nenhum .pptx selecionado'}</p>
            <p className="mt-2 text-xs text-text-secondary">Ultima sincronizacao: {formatDateTime(data.nativePptx.lastSyncedAt)}</p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-black/16 p-4">
            <p className="text-sm text-text-primary">{statusMessage}</p>
            {errorMessage ? <p className="mt-2 text-sm text-status-red">{errorMessage}</p> : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              leadingIcon={<FilePenLine className="h-4 w-4" />}
              variant="ghost"
              onClick={() => {
                if (deck?.filePath) {
                  void window.careca.shell.openPath(deck.filePath)
                }
              }}
              disabled={!deck}
            >
              Abrir no PowerPoint
            </Button>
            <Button
              leadingIcon={<FolderOpen className="h-4 w-4" />}
              variant="ghost"
              onClick={() => {
                if (deck?.filePath) {
                  void window.careca.shell.showItemInFolder(deck.filePath)
                }
              }}
              disabled={!deck}
            >
              Mostrar arquivo
            </Button>
          </div>

          <div className="space-y-2">
            {deck?.slides.map((slide) => (
              <button
                key={slide.slideIndex}
                type="button"
                onClick={() => setSelectedSlideIndex(slide.slideIndex)}
                className={
                  slide.slideIndex === selectedSlide?.slideIndex
                    ? 'w-full rounded-2xl border border-white/18 bg-white/8 px-4 py-3 text-left'
                    : 'w-full rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-left transition hover:bg-white/7'
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-text-primary">Slide {slide.slideIndex}</p>
                  <span className="text-xs uppercase tracking-[0.18em] text-text-secondary">{slide.textShapes.length} blocos</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-text-secondary">{slide.title}</p>
              </button>
            )) ?? null}
          </div>
        </Card>

        <Card className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-text-muted">Editor de texto nativo</p>
            <h3 className="mt-2 text-2xl font-semibold text-text-primary">
              {selectedSlide ? `Slide ${selectedSlide.slideIndex} · ${selectedSlide.title}` : 'Nenhum slide carregado'}
            </h3>
            <p className="mt-2 text-sm leading-7 text-text-secondary">
              Este primeiro corte edita as caixas de texto reais do arquivo PPTX usando o PowerPoint nativo do Windows.
            </p>
          </div>

          {selectedSlide ? (
            <div className="space-y-4">
              {selectedSlide.textShapes.length > 0 ? (
                selectedSlide.textShapes.map((shape) => (
                  <FieldInput
                    key={`${selectedSlide.slideIndex}-${shape.shapeName}`}
                    label={shape.shapeName}
                    type="textarea"
                    value={draftValues[toDraftKey(selectedSlide.slideIndex, shape.shapeName)] ?? shape.text}
                    hint="Caixa de texto do slide"
                    onChange={(value) =>
                      setDraftValues((current) => ({
                        ...current,
                        [toDraftKey(selectedSlide.slideIndex, shape.shapeName)]: value,
                      }))
                    }
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-white/8 bg-black/16 p-4 text-sm text-text-secondary">
                  Este slide nao tem caixas de texto detectadas pelo PowerPoint.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/8 bg-black/16 p-4 text-sm text-text-secondary">
              Escolha um arquivo `.pptx` para carregar os slides.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
