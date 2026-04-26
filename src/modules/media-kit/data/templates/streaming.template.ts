import type { MediaKitTemplateDefinition } from '@/modules/media-kit/data/mediakit.schema'

export const streamingTemplate: MediaKitTemplateDefinition = {
  id: 'streaming',
  label: 'Kit streaming/anime',
  description: 'Focado no TikTok react para series, animes e plataformas de video.',
  focus: 'Reacts curtos, tempo de estreia e bundles semanais para temporadas.',
  heroMetric: '40k-110k views por react em 7 dias',
  includedSlides: ['cover', 'about', 'audience', 'channels', 'performance', 'cases', 'pricing', 'contact'],
  defaultChannel: 'react',
}

