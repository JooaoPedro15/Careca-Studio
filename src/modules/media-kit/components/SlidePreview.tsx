import type { MediaKitData, MediaKitSlideId, MediaKitTemplate } from '@/modules/media-kit/data/mediakit.schema'
import { AboutSlide } from '@/modules/media-kit/components/slides/AboutSlide'
import { AudienceSlide } from '@/modules/media-kit/components/slides/AudienceSlide'
import { CasesSlide } from '@/modules/media-kit/components/slides/CasesSlide'
import { ChannelsSlide } from '@/modules/media-kit/components/slides/ChannelsSlide'
import { ContactSlide } from '@/modules/media-kit/components/slides/ContactSlide'
import { CoverSlide } from '@/modules/media-kit/components/slides/CoverSlide'
import { PerformanceSlide } from '@/modules/media-kit/components/slides/PerformanceSlide'
import { PricingSlide } from '@/modules/media-kit/components/slides/PricingSlide'

interface SlidePreviewProps {
  slideId: MediaKitSlideId
  data: MediaKitData
  template: MediaKitTemplate
  compact?: boolean
}

export function SlidePreview({ slideId, data, template, compact = false }: SlidePreviewProps) {
  const slide = {
    cover: <CoverSlide data={data} template={template} compact={compact} />,
    about: <AboutSlide data={data} template={template} compact={compact} />,
    audience: <AudienceSlide data={data} template={template} compact={compact} />,
    channels: <ChannelsSlide data={data} template={template} compact={compact} />,
    performance: <PerformanceSlide data={data} template={template} compact={compact} />,
    cases: <CasesSlide data={data} template={template} compact={compact} />,
    pricing: <PricingSlide data={data} template={template} compact={compact} />,
    contact: <ContactSlide data={data} template={template} compact={compact} />,
  }[slideId]

  return <div className={compact ? 'aspect-[4/3] overflow-hidden rounded-[30px]' : 'min-h-[620px]'}>{slide}</div>
}

