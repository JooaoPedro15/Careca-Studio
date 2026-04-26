import type { ExternalMediaKitSlide } from '@/modules/media-kit/data/mediakit.schema'

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Nao foi possivel carregar a imagem do slide externo.'))
    image.src = source
  })
}

export async function getImageSize(source: string): Promise<{ width: number; height: number }> {
  const image = await loadImage(source)
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  }
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const explicitLines = text.split('\n')
  const result: string[] = []

  explicitLines.forEach((line) => {
    const words = line.split(' ')
    let currentLine = ''

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const width = context.measureText(testLine).width

      if (width > maxWidth && currentLine) {
        result.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })

    result.push(currentLine)
  })

  return result.filter(Boolean)
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }

      reject(new Error('Formato de imagem invalido.'))
    }
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

export async function renderExternalSlideToCanvas(slide: ExternalMediaKitSlide): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = slide.canvas.width
  canvas.height = slide.canvas.height

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas indisponivel.')
  }

  context.fillStyle = '#050505'
  context.fillRect(0, 0, canvas.width, canvas.height)

  if (slide.backgroundImage) {
    const image = await loadImage(slide.backgroundImage)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
  }

  slide.blocks.forEach((block) => {
    context.font = `${block.fontWeight} ${block.fontSize}px "Space Grotesk", sans-serif`
    context.fillStyle = block.color
    context.textAlign = block.align
    context.textBaseline = 'top'

    const x = block.align === 'center' ? block.x + block.width / 2 : block.align === 'right' ? block.x + block.width : block.x
    const lines = wrapText(context, block.text, block.width)
    const lineHeight = Math.round(block.fontSize * 1.24)

    lines.forEach((line, index) => {
      context.fillText(line, x, block.y + index * lineHeight, block.width)
    })
  })

  return canvas
}

export async function exportExternalSlideAsPng(slide: ExternalMediaKitSlide): Promise<void> {
  const canvas = await renderExternalSlideToCanvas(slide)

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve()
        return
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = slide.fileName ? `${slide.fileName.replace(/\.[^.]+$/, '')}-editado.png` : 'careca-slide-externo.png'
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      resolve()
    }, 'image/png')
  })
}
