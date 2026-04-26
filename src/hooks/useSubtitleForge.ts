import { startTransition, useEffectEvent } from 'react'
import { useEffect } from 'react'

import { getFileName } from '@/lib/utils'
import { useAppStore } from '@/store/appStore'
import type {
  SubtitleDoneEvent,
  SubtitleErrorEvent,
  SubtitleProgressEvent,
  SubtitleTaskOptions,
} from '@/types/subtitle'

const mediaFilters = [
  {
    name: 'Midia',
    extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'mp3', 'wav', 'm4a', 'aac', 'flac'],
  },
]

export interface QueueFilesResult {
  ok: boolean
  message: string | null
}

// Captura um snapshot da configuracao atual para enviar junto com cada nova tarefa.
function getSettingsSnapshot(): Partial<SubtitleTaskOptions> {
  return useAppStore.getState().subtitleSettings
}

export function useSubtitleForge() {
  // A API do preload e opcional para permitir que a UI ainda renderize fora do Electron.
  const carecaApi = typeof window !== 'undefined' ? window.careca : undefined

  // Cada handler traduz eventos do backend em atualizacoes da store global.
  const handleProgress = useEffectEvent((data: SubtitleProgressEvent) => {
    useAppStore.getState().upsertSubtitleProgress(data)
  })

  const handleDone = useEffectEvent((data: SubtitleDoneEvent) => {
    useAppStore.getState().completeSubtitleTask(data)
  })

  const handleError = useEffectEvent((data: SubtitleErrorEvent) => {
    useAppStore.getState().failSubtitleTask(data)
  })

  useEffect(() => {
    // Registra os listeners uma unica vez enquanto a pagina estiver montada.
    if (!carecaApi?.subtitle) {
      console.error('[careca] preload API indisponivel no renderer')
      return
    }

    const offProgress = carecaApi.subtitle.onProgress((data) => handleProgress(data))
    const offDone = carecaApi.subtitle.onDone((data) => handleDone(data))
    const offError = carecaApi.subtitle.onError((data) => handleError(data))

    return () => {
      offProgress()
      offDone()
      offError()
    }
  }, [carecaApi, handleDone, handleError, handleProgress])

  // Converte arquivos vindos do navegador/drag and drop em caminhos absolutos.
  function resolvePathsFromFiles(files: FileList | null): string[] {
    if (!files) {
      return []
    }

    return Array.from(files)
      .map((file) => carecaApi?.dialog?.getPathForFile(file))
      .filter((path): path is string => Boolean(path))
  }

  // Enfileira um ou mais arquivos e cria o estado inicial das tasks no renderer.
  async function queuePaths(paths: string[]): Promise<QueueFilesResult> {
    const sanitizedPaths = Array.from(new Set(paths.filter(Boolean)))
    if (sanitizedPaths.length === 0) {
      return {
        ok: false,
        message: 'Nenhum arquivo valido foi encontrado.',
      }
    }

    if (!carecaApi?.subtitle) {
      console.error('[careca] subtitle API indisponivel para enfileirar arquivos')
      return {
        ok: false,
        message: 'A API desktop do Careca Studio nao esta disponivel. Abra com npm.cmd run electron:dev.',
      }
    }

    const settings = getSettingsSnapshot()

    try {
      for (const filePath of sanitizedPaths) {
        const taskId = await carecaApi.subtitle.process(filePath, settings)

        startTransition(() => {
          useAppStore.getState().upsertSubtitleProgress({
            taskId,
            filePath,
            fileName: getFileName(filePath),
            model: settings.model ?? 'large-v3',
            language: settings.language ?? 'pt',
            device: settings.useCpu ? 'cpu' : 'cuda',
            status: 'queued',
            stage: 'queued',
            message: 'Tarefa adicionada a fila.',
            progress: null,
          })
        })
      }

      return {
        ok: true,
        message: null,
      }
    } catch (error) {
      console.error('[careca] falha ao enfileirar arquivo', error)
      return {
        ok: false,
        message: 'Nao foi possivel adicionar o arquivo a fila. Veja se o Electron e o backend estao ativos.',
      }
    }
  }

  // Reaproveita o fluxo de fila quando a entrada vier de um input de arquivos.
  async function queueFileSelection(files: FileList | null): Promise<QueueFilesResult> {
    if (!files || files.length === 0) {
      return {
        ok: false,
        message: 'Nenhum arquivo foi selecionado.',
      }
    }

    const paths = resolvePathsFromFiles(files)
    if (paths.length === 0) {
      return {
        ok: false,
        message: 'Nao foi possivel ler o caminho do arquivo selecionado.',
      }
    }

    return queuePaths(paths)
  }

  return {
    queuePaths,
    queueFileSelection,
    pickFiles: async (): Promise<QueueFilesResult> => {
      // Abre o seletor nativo do Electron e envia os arquivos escolhidos para a fila.
      if (!carecaApi?.dialog) {
        console.error('[careca] dialog API indisponivel para abrir arquivos')
        return {
          ok: false,
          message: 'O seletor de arquivos do Electron nao esta disponivel. Abra com npm.cmd run electron:dev.',
        }
      }

      const filePaths = await carecaApi.dialog.openFiles(mediaFilters)
      if (filePaths.length === 0) {
        return {
          ok: false,
          message: 'Nenhum arquivo foi selecionado.',
        }
      }

      return queuePaths(filePaths)
    },
    cancelTask: async (taskId: string) => {
      await carecaApi?.subtitle?.cancel(taskId)
    },
    openOutput: async (outputPath: string | null) => {
      // Revela o arquivo final no explorador apenas quando ja existe um caminho de saida.
      if (!outputPath) {
        return
      }

      await carecaApi?.shell?.showItemInFolder(outputPath)
    },
    retryTask: async (filePath: string) => {
      // Reprocessa o mesmo arquivo reaproveitando as configuracoes atuais da store.
      await queuePaths([filePath])
    },
  }
}
