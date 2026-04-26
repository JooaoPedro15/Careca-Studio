import type { MediaKitData } from '@/modules/media-kit/data/mediakit.schema'

function jitter(base: number, delta: number): number {
  return Math.max(0, Math.round(base + delta))
}

export async function simulateMetricSync(data: MediaKitData): Promise<MediaKitData> {
  await new Promise((resolve) => window.setTimeout(resolve, 600))

  const now = new Date().toISOString()
  const currentMainAverage =
    data.commercialChannels.main.youtube.shortsPerformance.avgViews +
    data.commercialChannels.main.tiktok.shortsPerformance.avgViews

  return {
    ...data,
    meta: {
      ...data.meta,
      lastUpdated: now,
    },
    commercialChannels: {
      ...data.commercialChannels,
      main: {
        ...data.commercialChannels.main,
        youtube: {
          ...data.commercialChannels.main.youtube,
          subscribers: jitter(data.commercialChannels.main.youtube.subscribers, 2100),
          monthlyViews: jitter(data.commercialChannels.main.youtube.monthlyViews, 180000),
          shortsPerformance: {
            ...data.commercialChannels.main.youtube.shortsPerformance,
            avgViews: jitter(data.commercialChannels.main.youtube.shortsPerformance.avgViews, 7000),
            medianViews: jitter(data.commercialChannels.main.youtube.shortsPerformance.medianViews, 4500),
          },
          lastSyncedAt: now,
        },
        tiktok: {
          ...data.commercialChannels.main.tiktok,
          followers: jitter(data.commercialChannels.main.tiktok.followers, 1700),
          shortsPerformance: {
            ...data.commercialChannels.main.tiktok.shortsPerformance,
            avgViews: jitter(data.commercialChannels.main.tiktok.shortsPerformance.avgViews, 8000),
            medianViews: jitter(data.commercialChannels.main.tiktok.shortsPerformance.medianViews, 5000),
          },
        },
      },
      react: {
        ...data.commercialChannels.react,
        tiktok: {
          ...data.commercialChannels.react.tiktok,
          followers: jitter(data.commercialChannels.react.tiktok.followers, 950),
          shortsPerformance: {
            ...data.commercialChannels.react.tiktok.shortsPerformance,
            avgViews: jitter(data.commercialChannels.react.tiktok.shortsPerformance.avgViews, 5000),
            medianViews: jitter(data.commercialChannels.react.tiktok.shortsPerformance.medianViews, 3200),
          },
        },
      },
    },
    combinedShortsReach: {
      ...data.combinedShortsReach,
      main: {
        averagePerPublication: jitter(currentMainAverage, 15000),
        label: '100k-350k views combinadas em 7 dias',
      },
      react: {
        averagePerPublication: jitter(data.combinedShortsReach.react.averagePerPublication, 3500),
        label: '40k-110k views por react em 7 dias',
      },
    },
  }
}

