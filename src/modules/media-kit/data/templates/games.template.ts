import type { MediaKitTemplateDefinition } from '@/modules/media-kit/data/mediakit.schema'

export const gamesTemplate: MediaKitTemplateDefinition = {
  id: 'games',
  label: 'Kit games',
  description: 'Focado no canal principal e nos bundles de games.',
  focus: 'Shorts de games como produto hero, bundles de lancamento e provas sociais de gaming.',
  heroMetric: '100k-350k views combinadas em YouTube Shorts + TikTok games',
  includedSlides: ['cover', 'about', 'channels', 'performance', 'cases', 'pricing', 'contact'],
  defaultChannel: 'main',
}

