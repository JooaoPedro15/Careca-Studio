export interface CreatorProfile {
  nome: string
  canal: string
  inscritos: number
  views_28d: number
  espectadores_unicos_28d: number
  tempo_exibicao_horas_28d: number
  retencao_media: number
  recorrentes: number
  formato_principal: string
  views_por_short: string
  mei: boolean
  emite_nf: boolean
  canais_localizados: string[]
  publico: {
    genero: { masculino: number; feminino: number }
    idade: Record<string, number>
    geografia: Record<string, number>
    renda_familiar: Record<string, number>
    status_parental: { nao_pais: number; pais: number }
    interesses_alto: string[]
    intencao_compra_alta: string[]
  }
}

export const ROBERTO_CARECA_PROFILE: CreatorProfile = {
  nome: 'Roberto Careca',
  canal: 'youtube.com/@robertocareca',
  inscritos: 405000,
  views_28d: 7000000,
  espectadores_unicos_28d: 1900000,
  tempo_exibicao_horas_28d: 33300,
  retencao_media: 88.2,
  recorrentes: 76.1,
  formato_principal: 'shorts',
  views_por_short: '50000-200000',
  mei: true,
  emite_nf: true,
  canais_localizados: ['es', 'en', 'de'],
  publico: {
    genero: { masculino: 61.4, feminino: 38.0 },
    idade: {
      '13-17': 33.3,
      '18-24': 9.5,
      '25-34': 18.9,
      '35-44': 22.0,
      '45-54': 11.2,
      '55-64': 3.0,
      '65+': 2.2,
    },
    geografia: {
      brasil: 96.4,
      portugal: 2.4,
    },
    renda_familiar: {
      top_10: 28.9,
      top_11_20: 30.2,
      top_21_30: 18.3,
      top_31_40: 11.1,
      lower_50: 7.7,
    },
    status_parental: { nao_pais: 62.9, pais: 37.6 },
    interesses_alto: [
      'Hardcore Gamers',
      'Adventure & Strategy Game Fans',
      'Casual & Social Gamers',
      'Shooter Game Fans',
      'Fans of New & Upcoming Video Games',
    ],
    intencao_compra_alta: [
      'Photo Printing Services',
      'Photo & Video Services',
      'Computers',
      'Computers & Peripherals',
      'Pro Musician & DJ Equipment',
    ],
  },
}
