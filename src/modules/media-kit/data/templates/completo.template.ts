import type { MediaKitTemplateDefinition } from '@/modules/media-kit/data/mediakit.schema'

export const completoTemplate: MediaKitTemplateDefinition = {
  id: 'completo',
  label: 'Kit completo',
  description: 'Mistura os dois canais comerciais e serve para propostas consultivas.',
  focus: 'Visao geral do creator, canais, performance, cases e tabela completa.',
  heroMetric: '100k-350k views combinadas por publicacao',
  includedSlides: ['cover', 'about', 'audience', 'channels', 'performance', 'cases', 'pricing', 'contact'],
  defaultChannel: 'mixed',
}

