import { ipcMain, BrowserWindow } from 'electron'

import { resolveGeminiApiKey } from '../services/gemini-key-resolver.js'
import { createBrandCache } from '../services/brand-cache.js'
import { createRunHistory } from '../services/run-history.js'
import { runProspection, GEMINI_MODEL_FALLBACK_CHAIN } from '../services/partner-scout-agent.js'

import type { BrandStatus } from '../../src/modules/partner-scout-v2/data/brand-cache.types.js'
import type { ContatoMarca } from '../../src/modules/partner-scout-v2/agent/schema.js'
import { ROBERTO_CARECA_PROFILE } from '../../src/modules/partner-scout-v2/data/creator-profile.js'

// =============================================================================
// LEGACY (v1) — Partner Scout YouTube signals
// Mantido enquanto a UI v1 (`src/modules/partner-scout/`) ainda usa este IPC.
// Será removido na Task 10 (junto com o módulo v1).
// =============================================================================

interface OfficialYoutubeSignal {
  brand: string
  publishedAt: string
  title: string
  url: string
  evidence: string
  keywords: string[]
}

interface BrandYoutubeSource {
  brand: string
  handle: string
  keywords: string[]
}

const brandYoutubeSources: BrandYoutubeSource[] = [
  {
    brand: 'Ubisoft',
    handle: 'Ubisoft',
    keywords: ['trailer', 'reveal', 'gameplay', 'launch', 'update'],
  },
  {
    brand: 'Xbox Game Pass',
    handle: 'xbox',
    keywords: ['game pass', 'coming to game pass', 'launch trailer', 'reveal'],
  },
  {
    brand: 'PlayStation Plus',
    handle: 'playstation',
    keywords: ['playstation plus', 'monthly games', 'catalog', 'trailer', 'gameplay'],
  },
  {
    brand: 'EA',
    handle: 'EA',
    keywords: ['trailer', 'reveal', 'gameplay', 'launch', 'wishlist'],
  },
  {
    brand: 'Capcom',
    handle: 'capcom',
    keywords: ['trailer', 'gameplay', 'launch', 'reveal', 'demo'],
  },
  {
    brand: 'Riot Games',
    handle: 'RiotGames',
    keywords: ['update', 'season', 'event', 'trailer', 'reveal'],
  },
  {
    brand: 'Epic Games Store',
    handle: 'EpicGames',
    keywords: ['free', 'store', 'launch', 'trailer', 'reveal'],
  },
]

function escapeXml(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

async function resolveYoutubeChannelId(handle: string): Promise<string | null> {
  const response = await fetch(`https://www.youtube.com/@${handle}`)

  if (!response.ok) {
    return null
  }

  const html = await response.text()
  const match =
    html.match(/"channelId":"(UC[\w-]+)"/) ??
    html.match(/"externalId":"(UC[\w-]+)"/) ??
    html.match(/https:\/\/www\.youtube\.com\/channel\/(UC[\w-]+)/)

  return match?.[1] ?? null
}

function parseFeedEntries(xml: string): Array<{ title: string; publishedAt: string; videoId: string }> {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? []

  return entries
    .map((entry) => {
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]
      const publishedAt = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]
      const videoId = entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)?.[1]

      if (!title || !publishedAt || !videoId) {
        return null
      }

      return {
        title: escapeXml(title).trim(),
        publishedAt: publishedAt.trim(),
        videoId: videoId.trim(),
      }
    })
    .filter((item): item is { title: string; publishedAt: string; videoId: string } => Boolean(item))
}

function isRelevantVideo(title: string, keywords: string[]): boolean {
  const normalized = title.toLowerCase()
  return keywords.some((keyword) => normalized.includes(keyword))
}

async function fetchOfficialYoutubeSignalsForSource(source: BrandYoutubeSource): Promise<OfficialYoutubeSignal[]> {
  const channelId = await resolveYoutubeChannelId(source.handle)

  if (!channelId) {
    return []
  }

  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`)

  if (!response.ok) {
    return []
  }

  const xml = await response.text()

  return parseFeedEntries(xml)
    .filter((entry) => isRelevantVideo(entry.title, source.keywords))
    .slice(0, 3)
    .map((entry) => ({
      brand: source.brand,
      publishedAt: entry.publishedAt,
      title: entry.title,
      url: `https://www.youtube.com/watch?v=${entry.videoId}`,
      evidence: `Canal oficial publicou "${entry.title}" em ${new Intl.DateTimeFormat('pt-BR').format(new Date(entry.publishedAt))}.`,
      keywords: source.keywords,
    }))
}

// =============================================================================
// V2 — Partner Scout LLM agent (Gemini + persistencia)
// =============================================================================

const brandCache = createBrandCache({})
const runHistory = createRunHistory({})

let activeRunController: AbortController | null = null
let activeRunId: string | null = null

function broadcast(channel: string, payload: unknown) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerPartnerScoutHandlers() {
  // ---- Legacy v1 handler (mantido ate a Task 10) ----
  ipcMain.handle('partnerScout:fetchOfficialYoutubeSignals', async () => {
    const settled = await Promise.allSettled(
      brandYoutubeSources.map((source) => fetchOfficialYoutubeSignalsForSource(source)),
    )

    return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  })

  // ---- V2 handlers ----
  ipcMain.handle('partnerScout:getApiKeyStatus', () => {
    const r = resolveGeminiApiKey()
    return {
      configured: r.key.length > 0,
      source: r.source,
      masked: r.masked,
    }
  })

  ipcMain.handle('partnerScout:getCreatorProfile', () => ROBERTO_CARECA_PROFILE)

  ipcMain.handle('partnerScout:run', async () => {
    if (activeRunController) {
      throw new Error('RUN_ALREADY_IN_PROGRESS')
    }

    const { key } = resolveGeminiApiKey()
    if (!key) {
      throw new Error('GEMINI_API_KEY_MISSING')
    }

    const cacheHints = brandCache.getActiveSkipList(90)
    const controller = new AbortController()
    activeRunController = controller

    const promise = runProspection({
      apiKey: key,
      creator: ROBERTO_CARECA_PROFILE,
      cacheHints,
      modelChain: GEMINI_MODEL_FALLBACK_CHAIN,
      signal: controller.signal,
      onProgress: (event) => broadcast('partnerScout:progress', event),
    })

    promise
      .then(({ run, result }) => {
        runHistory.append(run)
        if (result) {
          for (const marca of result.resultado_final) {
            brandCache.upsertFromRun(marca)
          }
        }
        broadcast('partnerScout:done', run)
      })
      .catch((error: Error) => {
        broadcast('partnerScout:error', { runId: activeRunId, error: error.message })
      })
      .finally(() => {
        activeRunController = null
        activeRunId = null
      })

    activeRunId = `pending-${Date.now()}` // sera sobrescrito pelo runId real no done
    return { runId: activeRunId }
  })

  ipcMain.handle('partnerScout:abort', () => {
    if (!activeRunController) return { ok: false }
    activeRunController.abort(new Error('user-aborted'))
    return { ok: true }
  })

  ipcMain.handle('partnerScout:listRuns', () => runHistory.list())
  ipcMain.handle('partnerScout:getRun', (_, id: string) => runHistory.get(id))
  ipcMain.handle('partnerScout:deleteRun', (_, id: string) => {
    runHistory.delete(id)
    return { ok: true }
  })

  ipcMain.handle('partnerScout:listCache', () => brandCache.list())

  ipcMain.handle(
    'partnerScout:setBrandStatus',
    (_, payload: { nomeNormalizado: string; status: BrandStatus; nota?: string }) => {
      return brandCache.setStatus(payload.nomeNormalizado, payload.status, payload.nota)
    },
  )

  ipcMain.handle(
    'partnerScout:updateBrandContact',
    (_, payload: { nomeNormalizado: string; patch: Partial<ContatoMarca> }) => {
      return brandCache.updateContact(payload.nomeNormalizado, payload.patch)
    },
  )

  ipcMain.handle(
    'partnerScout:addBrandNote',
    (_, payload: { nomeNormalizado: string; text: string }) => {
      return brandCache.addNote(payload.nomeNormalizado, payload.text)
    },
  )
}
