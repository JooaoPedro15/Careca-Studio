import type { BundleItem, MediaKitData, MediaKitTemplate, PricingItem } from '@/modules/media-kit/data/mediakit.schema'

interface PricingSnapshot {
  items: PricingItem[]
  bundles: BundleItem[]
  highlightedBundleId: string | null
  disclaimer: string
}

export function getPricingSnapshot(data: MediaKitData, template: MediaKitTemplate): PricingSnapshot {
  if (template === 'games') {
    return {
      items: data.pricing.items.filter((item) => item.channel === 'main'),
      bundles: data.pricing.bundles.filter((bundle) => bundle.channel === 'main'),
      highlightedBundleId: 'mensal_games',
      disclaimer: data.pricing.disclaimer,
    }
  }

  if (template === 'streaming') {
    return {
      items: data.pricing.items.filter((item) => item.channel === 'react'),
      bundles: data.pricing.bundles.filter((bundle) => bundle.channel === 'react'),
      highlightedBundleId: 'streaming_launch',
      disclaimer: data.pricing.disclaimer,
    }
  }

  return {
    items: data.pricing.items,
    bundles: data.pricing.bundles,
    highlightedBundleId: 'mensal_games',
    disclaimer: data.pricing.disclaimer,
  }
}

