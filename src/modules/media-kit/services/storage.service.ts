import defaultMediaKitJson from '@/modules/media-kit/data/mediakit.default.json'
import type { MediaKitData } from '@/modules/media-kit/data/mediakit.schema'

const STORAGE_KEY = 'careca-studio:media-kit:v1'

function cloneDefaultData(): MediaKitData {
  return structuredClone(defaultMediaKitJson) as MediaKitData
}

export function getDefaultMediaKitData(): MediaKitData {
  return cloneDefaultData()
}

function mergeMediaKitData(partial: Partial<MediaKitData>): MediaKitData {
  const defaults = cloneDefaultData()

  return {
    ...defaults,
    ...partial,
    meta: { ...defaults.meta, ...partial.meta },
    creator: { ...defaults.creator, ...partial.creator },
    commercialChannels: {
      main: {
        ...defaults.commercialChannels.main,
        ...partial.commercialChannels?.main,
        youtube: {
          ...defaults.commercialChannels.main.youtube,
          ...partial.commercialChannels?.main?.youtube,
        },
        tiktok: {
          ...defaults.commercialChannels.main.tiktok,
          ...partial.commercialChannels?.main?.tiktok,
        },
        instagram: partial.commercialChannels?.main?.instagram ?? defaults.commercialChannels.main.instagram,
      },
      react: {
        ...defaults.commercialChannels.react,
        ...partial.commercialChannels?.react,
        tiktok: {
          ...defaults.commercialChannels.react.tiktok,
          ...partial.commercialChannels?.react?.tiktok,
        },
      },
    },
    combinedShortsReach: {
      main: { ...defaults.combinedShortsReach.main, ...partial.combinedShortsReach?.main },
      react: { ...defaults.combinedShortsReach.react, ...partial.combinedShortsReach?.react },
    },
    audience: {
      main: { ...defaults.audience.main, ...partial.audience?.main },
      react: { ...defaults.audience.react, ...partial.audience?.react },
    },
    pricing: {
      ...defaults.pricing,
      ...partial.pricing,
      items: partial.pricing?.items ?? defaults.pricing.items,
      bundles: partial.pricing?.bundles ?? defaults.pricing.bundles,
    },
    contact: { ...defaults.contact, ...partial.contact },
    cases: partial.cases ?? defaults.cases,
    externalSlide: {
      ...defaults.externalSlide,
      ...partial.externalSlide,
      canvas: { ...defaults.externalSlide.canvas, ...partial.externalSlide?.canvas },
      blocks: partial.externalSlide?.blocks ?? defaults.externalSlide.blocks,
    },
    nativePptx: {
      ...defaults.nativePptx,
      ...partial.nativePptx,
    },
  }
}

export function loadMediaKitData(): MediaKitData {
  if (typeof window === 'undefined') {
    return cloneDefaultData()
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    return cloneDefaultData()
  }

  try {
    return mergeMediaKitData(JSON.parse(raw) as Partial<MediaKitData>)
  } catch {
    return cloneDefaultData()
  }
}

export function saveMediaKitData(data: MediaKitData): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function resetMediaKitData(): MediaKitData {
  const fresh = cloneDefaultData()
  saveMediaKitData(fresh)
  return fresh
}
