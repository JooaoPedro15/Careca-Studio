import { ipcMain } from 'electron'

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

export function registerPartnerScoutHandlers() {
  ipcMain.handle('partnerScout:fetchOfficialYoutubeSignals', async () => {
    const settled = await Promise.allSettled(brandYoutubeSources.map((source) => fetchOfficialYoutubeSignalsForSource(source)))

    return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
  })
}
