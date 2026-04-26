export interface PptxTextShape {
  shapeName: string
  text: string
}

export interface PptxSlide {
  slideIndex: number
  title: string
  textShapes: PptxTextShape[]
}

export interface PptxDeck {
  filePath: string
  fileName: string
  slideCount: number
  updatedAt: string
  slides: PptxSlide[]
}

export interface PptxTextUpdate {
  slideIndex: number
  shapeName: string
  text: string
}
