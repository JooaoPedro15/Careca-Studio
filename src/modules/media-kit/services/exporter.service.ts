import type { MediaKitData, MediaKitSlideId, MediaKitTemplate } from '@/modules/media-kit/data/mediakit.schema'
import { MEDIA_KIT_SLIDES } from '@/modules/media-kit/data/mediakit.schema'
import { getPricingSnapshot } from '@/modules/media-kit/services/publi-pricer.bridge'

const WIDTH = 1440
const HEIGHT = 1080
const PADDING = 96

function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace('.0', '')}M`
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K`
  }

  return value.toString()
}

function buildSlideSummary(slideId: MediaKitSlideId, data: MediaKitData, template: MediaKitTemplate): string[] {
  const pricing = getPricingSnapshot(data, template)

  switch (slideId) {
    case 'cover':
      return [data.creator.positioning, data.combinedShortsReach.main.label, data.combinedShortsReach.react.label]
    case 'about':
      return [data.creator.bio, ...data.creator.differentials]
    case 'audience':
      return [
        `Games 18-24: ${data.audience.main.ageRanges[1]?.percent ?? 0}%`,
        `React 18-24: ${data.audience.react.ageRanges[1]?.percent ?? 0}%`,
        `Interesses games: ${data.audience.main.interests.join(', ')}`,
      ]
    case 'channels':
      return [
        `${data.commercialChannels.main.youtube.handle} - ${formatCompactNumber(data.commercialChannels.main.youtube.subscribers)} inscritos`,
        `${data.commercialChannels.main.tiktok.handle} - ${formatCompactNumber(data.commercialChannels.main.tiktok.followers)} seguidores`,
        `${data.commercialChannels.react.tiktok.handle} - ${formatCompactNumber(data.commercialChannels.react.tiktok.followers)} seguidores`,
      ]
    case 'performance':
      return [
        data.combinedShortsReach.main.label,
        `YT Shorts: ${formatCompactNumber(data.commercialChannels.main.youtube.shortsPerformance.avgViews)} medio`,
        `TikTok games: ${formatCompactNumber(data.commercialChannels.main.tiktok.shortsPerformance.avgViews)} medio`,
      ]
    case 'cases':
      return data.cases.slice(0, 3).map((item) => `${item.brand}: ${item.results}`)
    case 'pricing':
      return [
        `Bundle foco: ${pricing.bundles.find((bundle) => bundle.id === pricing.highlightedBundleId)?.name ?? 'Tabela base'}`,
        ...pricing.bundles.slice(0, 2).map((bundle) => `${bundle.name} - ${bundle.ticketMedio}`),
      ]
    case 'contact':
      return [data.contact.email, data.contact.whatsapp ?? '', data.contact.manager?.email ?? '']
  }
}

async function renderSlideToCanvas(
  slideId: MediaKitSlideId,
  data: MediaKitData,
  template: MediaKitTemplate,
): Promise<HTMLCanvasElement> {
  const slideMeta = MEDIA_KIT_SLIDES.find((slide) => slide.id === slideId)
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas API indisponivel para exportacao.')
  }

  const lines = buildSlideSummary(slideId, data, template)

  context.fillStyle = '#060606'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#111111'
  context.fillRect(PADDING / 2, PADDING / 2, WIDTH - PADDING, HEIGHT - PADDING)
  context.strokeStyle = 'rgba(255,255,255,0.08)'
  context.lineWidth = 3
  context.strokeRect(PADDING / 2, PADDING / 2, WIDTH - PADDING, HEIGHT - PADDING)

  context.fillStyle = '#8ab4ff'
  context.font = '600 28px "JetBrains Mono", monospace'
  context.fillText(template.toUpperCase(), PADDING, 90)

  context.fillStyle = '#ffffff'
  context.font = '700 72px "Space Grotesk", sans-serif'
  context.fillText(slideMeta?.label ?? slideId, PADDING, 190)

  context.fillStyle = 'rgba(255,255,255,0.74)'
  context.font = '400 28px "Space Grotesk", sans-serif'
  context.fillText(slideMeta?.description ?? '', PADDING, 238)

  context.fillStyle = '#ffffff'
  context.font = '500 38px "Space Grotesk", sans-serif'
  lines.forEach((line, index) => {
    context.fillText(line, PADDING, 360 + index * 90)
  })

  context.fillStyle = 'rgba(255,255,255,0.35)'
  context.font = '400 22px "JetBrains Mono", monospace'
  context.fillText(`Exportado em ${new Intl.DateTimeFormat('pt-BR').format(new Date())}`, PADDING, HEIGHT - 100)

  return canvas
}

function downloadCanvas(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve()
        return
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      resolve()
    }, 'image/png')
  })
}

export async function exportSlidesAsPng(
  slides: MediaKitSlideId[],
  data: MediaKitData,
  template: MediaKitTemplate,
): Promise<void> {
  for (const slideId of slides) {
    const canvas = await renderSlideToCanvas(slideId, data, template)
    await downloadCanvas(canvas, `careca-${template}-${slideId}.png`)
  }
}

export async function exportSlidesAsPdf(
  slides: MediaKitSlideId[],
  data: MediaKitData,
  template: MediaKitTemplate,
): Promise<void> {
  const images = await Promise.all(
    slides.map(async (slideId) => {
      const canvas = await renderSlideToCanvas(slideId, data, template)
      return canvas.toDataURL('image/png')
    }),
  )

  const popup = window.open('', '_blank', 'width=1200,height=900')

  if (!popup) {
    return
  }

  popup.document.write(`
    <html>
      <head>
        <title>Careca Studio - ${template}</title>
        <style>
          body { margin: 0; background: #000; font-family: sans-serif; }
          .page { page-break-after: always; padding: 24px; }
          img { width: 100%; border-radius: 16px; display: block; }
        </style>
      </head>
      <body>
        ${images.map((image) => `<div class="page"><img src="${image}" alt="" /></div>`).join('')}
        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
    </html>
  `)
  popup.document.close()
}
