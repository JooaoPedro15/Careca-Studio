import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type ClipFeedbackLabel = 'weak' | 'good' | 'viral'

export interface StoredClipFeedback {
  // Formato salvo em disco para reaproveitar feedback humano em cortes futuros.
  clipId: string
  sourcePath: string
  sourceName: string
  filePath: string
  fileName: string
  startSec: number
  endSec: number
  durationSec: number
  reason: string
  transcriptSnippet: string
  label: ClipFeedbackLabel
  updatedAt: number
}

interface ClipFeedbackFile {
  version: 1
  clips: StoredClipFeedback[]
}

const CLIP_FEEDBACK_FILE_NAME = 'clip-feedback-library.json'
const MAX_FEEDBACK_ENTRIES = 600

// Estrutura vazia usada quando ainda nao existe arquivo salvo.
function getDefaultFile(): ClipFeedbackFile {
  return {
    version: 1,
    clips: [],
  }
}

export function getClipFeedbackFilePath() {
  // Usa a pasta userData do Electron para guardar a biblioteca local fora do repo.
  return path.join(app.getPath('userData'), CLIP_FEEDBACK_FILE_NAME)
}

export async function readClipFeedbackFile(): Promise<ClipFeedbackFile> {
  // Faz parse defensivo do JSON para evitar quebrar o app por arquivo corrompido.
  const feedbackFilePath = getClipFeedbackFilePath()

  try {
    const raw = await readFile(feedbackFilePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<ClipFeedbackFile>

    if (!Array.isArray(parsed.clips)) {
      return getDefaultFile()
    }

    return {
      version: 1,
      clips: parsed.clips.filter(isStoredClipFeedback),
    }
  } catch {
    return getDefaultFile()
  }
}

export async function saveClipFeedbackEntry(entry: StoredClipFeedback): Promise<void> {
  // Mantem apenas a versao mais recente de cada clip e limita o tamanho do historico.
  const feedbackFilePath = getClipFeedbackFilePath()
  const current = await readClipFeedbackFile()
  const nextClips = [
    entry,
    ...current.clips.filter((clip) => clip.clipId !== entry.clipId),
  ]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_FEEDBACK_ENTRIES)

  await mkdir(path.dirname(feedbackFilePath), { recursive: true })
  await writeFile(
    feedbackFilePath,
    JSON.stringify(
      {
        version: 1,
        clips: nextClips,
      },
      null,
      2,
    ),
    'utf8',
  )
}

function isStoredClipFeedback(value: unknown): value is StoredClipFeedback {
  // Valida o shape minimo aceito antes de considerar o registro como confiavel.
  if (!value || typeof value !== 'object') {
    return false
  }

  const clip = value as Partial<StoredClipFeedback>

  return (
    typeof clip.clipId === 'string' &&
    typeof clip.sourcePath === 'string' &&
    typeof clip.sourceName === 'string' &&
    typeof clip.filePath === 'string' &&
    typeof clip.fileName === 'string' &&
    typeof clip.startSec === 'number' &&
    typeof clip.endSec === 'number' &&
    typeof clip.durationSec === 'number' &&
    typeof clip.reason === 'string' &&
    typeof clip.transcriptSnippet === 'string' &&
    (clip.label === 'weak' || clip.label === 'good' || clip.label === 'viral') &&
    typeof clip.updatedAt === 'number'
  )
}
